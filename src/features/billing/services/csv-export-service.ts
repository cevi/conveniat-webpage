import type { VatSplitConfig } from '@/features/billing/services/vat-calculation';
import { calculateVat } from '@/features/billing/services/vat-calculation';
import type { FinanceCsvRow } from '@/features/billing/types';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

interface RolePricingEntry {
  roleTypePattern: string;
  label: string;
  amount: number;
  vatCode?: string | null;
  vatSplits?: VatSplitConfig[] | null;
}

/** One booking line: a slice of a bill that carries a single VAT rate. */
interface BookingLine {
  amount: number;
  vatCode: string;
  /** Distinguishes the lines of a split bill in the Description column. */
  label: string;
}

/**
 * Splits a bill into the lines the accounting import expects — one per VAT rate, because a
 * booking line can only carry one rate.
 *
 * Bills raised since the split feature landed carry their own breakdown, which is what gets
 * exported: the settings may well have changed since, and the export has to agree with the
 * PDF the participant is holding. Older bills have no breakdown, so they fall back to the
 * single rate their role is configured with, exactly as this export always did.
 */
export function buildBookingLines(
  participant: BillParticipant,
  rolePricing: RolePricingEntry[],
): BookingLine[] {
  const grossAmount = participant.invoiceAmount ?? 0;
  const breakdown = participant.vatBreakdown ?? [];

  if (breakdown.length > 0) {
    return breakdown.map((line) => ({
      amount: (line.netAmount ?? 0) + (line.vatAmount ?? 0),
      vatCode: line.vatCode ?? '',
      label: line.label ?? '',
    }));
  }

  const roleType = participant.roleType ?? '';
  const pricing =
    rolePricing.find((rp) => roleType.toLowerCase().includes(rp.roleTypePattern.toLowerCase())) ??
    rolePricing[0];

  const splits = pricing?.vatSplits ?? [];
  if (splits.length === 0) {
    return [{ amount: grossAmount, vatCode: pricing?.vatCode ?? '', label: '' }];
  }

  // A bill raised before its role gained a split: re-derive the slices from the gross
  // amount that was actually invoiced, so the lines still add up to it.
  const net = calculateVat({ netAmount: pricing?.amount ?? 0, vatSplits: splits });
  const scale = net.totalAmount === 0 ? 0 : grossAmount / net.totalAmount;
  return net.components.map((component) => ({
    amount: Math.round((component.netAmount + component.vatAmount) * scale * 100) / 100,
    vatCode: component.formattedVatCode,
    label: component.label,
  }));
}

/**
 * Generates a CSV string in the finance department's format.
 *
 * Columns: Date, DocInvoice, ExternalReference, AccountDebit, AccountCredit,
 * Amount, VatCode, DateExpiration, Description
 *
 * A bill taxed at a single rate produces one row. A bill split across rates produces one
 * row per rate, sharing the invoice number and reference.
 */
export async function generateFinanceCsv(payload: Payload): Promise<string> {
  // 1. Load settings
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  const accountDebit = (settings.accountDebit as string | undefined) ?? '1100';
  const accountCredit = (settings.accountCredit as string | undefined) ?? '3000';
  const rolePricing = (settings.rolePricing as RolePricingEntry[] | undefined) ?? [];
  const paymentDeadlineDays = (settings.paymentDeadlineDays as number | undefined) ?? 30;

  // 2. Query all generated/sent bills
  const participants = await payload.find({
    collection: 'bill-participants',
    where: {
      or: [
        { status: { equals: 'bill_created' } },
        { status: { equals: 'bill_sent' } },
        { status: { equals: 'reminder_sent' } },
      ],
    },
    limit: 10_000,
    sort: 'invoiceNumber',
  });

  const csvHeaders = [
    'Date',
    'DocInvoice',
    'ExternalReference',
    'AccountDebit',
    'AccountCredit',
    'Amount',
    'VatCode',
    'DateExpiration',
    'Description',
  ];

  if (participants.docs.length === 0) {
    return csvHeaders.join(';');
  }

  // 3. Build CSV rows
  const rows: FinanceCsvRow[] = participants.docs.flatMap((document_) => {
    const billDate =
      typeof document_.billCreatedDate === 'string'
        ? new Date(document_.billCreatedDate)
        : new Date();

    const expirationDate = new Date(billDate);
    expirationDate.setDate(expirationDate.getDate() + paymentDeadlineDays);

    const lines = buildBookingLines(document_, rolePricing);

    return lines.map((line) => ({
      Date: formatDate(billDate),
      DocInvoice: (document_.invoiceNumber as string | undefined) ?? '',
      ExternalReference: `QR-${(document_.referenceNumber as string | undefined) ?? ''}`,
      AccountDebit: accountDebit,
      AccountCredit: accountCredit,
      Amount: line.amount,
      VatCode: line.vatCode,
      DateExpiration: formatDate(expirationDate),
      Description:
        line.label === ''
          ? `Lagerbeitrag conveniat27 – ${String(document_.fullName)}`
          : `Lagerbeitrag conveniat27 (${line.label}) – ${String(document_.fullName)}`,
    }));
  });

  // 4. Generate CSV
  const csvLines = [
    csvHeaders.join(';'),
    ...rows.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header as keyof FinanceCsvRow];
          if (typeof value === 'number') return value.toFixed(2);
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(';'),
    ),
  ];

  return csvLines.join('\n');
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${String(year)}`;
}
