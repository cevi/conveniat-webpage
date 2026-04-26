import type { FinanceCsvRow } from '@/features/billing/types';
import type { Payload } from 'payload';

/**
 * Generates a CSV string in the finance department's format.
 *
 * Columns: Date, DocInvoice, ExternalReference, AccountDebit, AccountCredit,
 * Amount, VatCode, DateExpiration, Description
 */
export async function generateFinanceCsv(payload: Payload): Promise<string> {
  // 1. Load settings
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  const accountDebit = (settings.accountDebit as string | undefined) ?? '1100';
  const accountCredit = (settings.accountCredit as string | undefined) ?? '3000';
  const rolePricing =
    (settings.rolePricing as
      | Array<{ roleTypePattern: string; label: string; amount: number; vatCode?: string }>
      | undefined) ?? [];
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
  const rows: FinanceCsvRow[] = participants.docs.map((document_) => {
    const billDate =
      typeof document_.billCreatedDate === 'string'
        ? new Date(document_.billCreatedDate)
        : new Date();

    const expirationDate = new Date(billDate);
    expirationDate.setDate(expirationDate.getDate() + paymentDeadlineDays);

    const roleType = (document_.roleType as string | undefined) ?? '';
    const pricing =
      rolePricing.find((rp) => roleType.toLowerCase().includes(rp.roleTypePattern.toLowerCase())) ??
      rolePricing[0];
    const documentVatCode = pricing?.vatCode ?? '';

    return {
      Date: formatDate(billDate),
      DocInvoice: (document_.invoiceNumber as string | undefined) ?? '',
      ExternalReference: `QR-${(document_.referenceNumber as string | undefined) ?? ''}`,
      AccountDebit: accountDebit,
      AccountCredit: accountCredit,
      Amount: (document_.invoiceAmount as number | undefined) ?? 0,
      VatCode: documentVatCode,
      DateExpiration: formatDate(expirationDate),
      Description: `Lagerbeitrag conveniat27 – ${String(document_.fullName)}`,
    };
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
