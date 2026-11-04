import {
  isCancelled,
  populatedPdfFilenames,
  resolveIssuedBills,
} from '@/features/billing/services/issued-bills';
import { shortenEventName } from '@/features/billing/services/weekly-report';
import type { FinanceCsvRow } from '@/features/billing/types';
import type {
  BillParticipant,
  BillSetting,
  VisitDayBill,
} from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

interface RolePricingEntry {
  roleTypePattern: string;
  label: string;
}

/**
 * The column order of the finance export, shared by the CSV and the Excel workbook. Banana
 * matches columns by these exact header names, so the first eight must not be translated or
 * reworded. The last two say whether a bill was cancelled, and why.
 */
export const FINANCE_COLUMNS: (keyof FinanceCsvRow)[] = [
  'Date',
  'DocInvoice',
  'ExternalReference',
  'Amount',
  'DateExpiration',
  'Description',
  'AccountDebit',
  'AccountCredit',
  'Storniert',
  'Stornogrund',
];

/**
 * The accounts every booking is written against. They are fixed, not a setting: the finance
 * team's Banana file expects exactly these, and `[CA]` is the temporary counter account
 * Banana completes on import.
 */
const ACCOUNT_DEBIT = '11000';
const ACCOUNT_CREDIT = '[CA]';

/** The fee label the bill was raised under, e.g. "Teilnehmendenbeitrag". */
const resolveFeeLabel = (roleType: string, rolePricing: RolePricingEntry[]): string => {
  const match = rolePricing.find(
    (pricing) =>
      pricing.roleTypePattern !== '' &&
      roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase()),
  );
  if (match !== undefined) return match.label;
  return roleType.split('::').at(-1) ?? roleType;
};

/** Banana wants ISO dates, and the camp runs in Swiss time. */
const formatIsoDate = (date: Date): string =>
  date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });

/**
 * Builds one booking per bill ever raised, in invoice order.
 *
 * A bill is one line, even when it is split across several VAT rates: the booking is
 * matched against the camt.054 from the bank by its QR reference, and a payment settles the
 * whole bill. The VAT is assigned in Banana through the temporary counter account.
 *
 * A bill that was replaced by a newer one, or whose registration was removed, stays in the
 * list marked as cancelled: it may already have been paid, and that payment still has to be
 * matched to something.
 */
export function buildFinanceCsvRows(
  participants: BillParticipant[],
  settings: Pick<BillSetting, 'rolePricing' | 'paymentDeadlineDays'>,
): FinanceCsvRow[] {
  const rolePricing = (settings.rolePricing ?? []) as RolePricingEntry[];
  const paymentDeadlineDays = settings.paymentDeadlineDays ?? 30;

  const rows = participants.flatMap((participant) => {
    const description = [
      resolveFeeLabel(participant.roleType ?? '', rolePricing),
      participant.fullName,
      shortenEventName(participant.eventName),
    ].join(', ');

    const bills = resolveIssuedBills(participant, populatedPdfFilenames(participant.billPdfs));
    return bills.map((bill): FinanceCsvRow => {
      // The bill is dated, and its deadline runs, from the day it was raised.
      const billDate =
        typeof bill.billCreatedDate === 'string' ? new Date(bill.billCreatedDate) : new Date();
      const expirationDate = new Date(billDate);
      expirationDate.setDate(expirationDate.getDate() + paymentDeadlineDays);

      return {
        Date: formatIsoDate(billDate),
        DocInvoice: bill.invoiceNumber,
        // Banana matches this against the reference in the camt.054, which has no spaces.
        ExternalReference: (bill.referenceNumber ?? '').replaceAll(/\s/g, ''),
        Amount: bill.invoiceAmount ?? undefined,
        DateExpiration: formatIsoDate(expirationDate),
        Description: description,
        AccountDebit: ACCOUNT_DEBIT,
        AccountCredit: ACCOUNT_CREDIT,
        Storniert: isCancelled(bill),
        Stornogrund: bill.cancelReason ?? '',
      };
    });
  });

  return rows.sort((a, b) => a.DocInvoice.localeCompare(b.DocInvoice, 'de', { numeric: true }));
}

/** Why a Besuchstag bill no longer stands: its registration was cancelled, or it was replaced. */
const cancelReasonOf = (status: VisitDayBill['status']): string =>
  status === 'cancelled' ? 'Anmeldung storniert' : 'Neu ausgestellt';

/**
 * One booking per Besuchstag bill ever issued, so Banana gets both kinds of bill from one
 * export. A bill issued again keeps its earlier issue as a cancelled line, like a replaced camp
 * bill, and a cancelled registration cancels its last one. The revenue account comes from the
 * Besuchstag bill settings, the counter account `[CA]` where none is set.
 */
export function buildVisitDayFinanceRows(
  bills: Pick<
    VisitDayBill,
    'registrationNumber' | 'fullName' | 'status' | 'issuedBills' | 'dueDate' | 'issuedAt'
  >[],
  revenueAccount: string | null | undefined,
  paymentDeadlineDays: number,
): FinanceCsvRow[] {
  const accountCredit =
    typeof revenueAccount === 'string' && revenueAccount.trim() !== ''
      ? revenueAccount.trim()
      : ACCOUNT_CREDIT;
  const rows = bills.flatMap((bill) =>
    (bill.issuedBills ?? []).map((issued): FinanceCsvRow => {
      const issuedAt = new Date(issued.issuedAt);
      const expiration = new Date(issuedAt);
      expiration.setDate(expiration.getDate() + paymentDeadlineDays);
      const replaced = typeof issued.supersededAt === 'string' && issued.supersededAt !== '';
      return {
        Date: formatIsoDate(issuedAt),
        DocInvoice: issued.invoiceNumber,
        ExternalReference: issued.referenceNumber,
        Amount: issued.amount,
        DateExpiration: formatIsoDate(expiration),
        Description: ['Besuchstag', bill.fullName ?? '', bill.registrationNumber].join(', '),
        AccountDebit: ACCOUNT_DEBIT,
        AccountCredit: accountCredit,
        Storniert: replaced,
        Stornogrund: replaced ? cancelReasonOf(bill.status) : '',
      };
    }),
  );
  return rows.sort((a, b) => a.DocInvoice.localeCompare(b.DocInvoice, 'de', { numeric: true }));
}

const escapeCsvValue = (value: string | number | boolean | undefined): string => {
  if (value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return value.toFixed(2);
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

/**
 * Serialises the rows as a comma-separated file with a UTF-8 BOM and CRLF line endings,
 * the shape of the test file the finance team imported into Banana.
 */
export function formatFinanceCsv(rows: FinanceCsvRow[]): string {
  const lines = [
    FINANCE_COLUMNS.join(','),
    ...rows.map((row) => FINANCE_COLUMNS.map((header) => escapeCsvValue(row[header])).join(',')),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Loads every bill ever raised as a booking, in invoice order.
 */
export async function findFinanceCsvRows(payload: Payload): Promise<FinanceCsvRow[]> {
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  // Every row that was ever billed, whatever its status today: an accounting export that
  // quietly drops a line it emitted last week is worse than one that shows a line somebody
  // has to look at. A row keeps its invoice number once it has one. Depth 1 populates the
  // PDFs, whose names are all that is left of a bill replaced before `issuedBills` existed.
  const participants = await payload.find({
    collection: 'bill-participants',
    where: { invoiceNumber: { exists: true } },
    limit: 10_000,
    depth: 1,
    joins: false,
    context: { internal: true },
  });

  return [
    ...buildFinanceCsvRows(participants.docs, settings),
    ...(await findVisitDayFinanceRows(payload)),
  ];
}

/**
 * The bookings of every Besuchstag bill. They are paid into the same account, so finance books
 * both kinds of bill from one file; read by collection, the camp billing imports nothing of the
 * Besuchstag.
 */
export async function findVisitDayFinanceRows(payload: Payload): Promise<FinanceCsvRow[]> {
  const bills = await payload.find({
    collection: 'visit-day-bills',
    limit: 10_000,
    depth: 0,
    joins: false,
    overrideAccess: true,
  });
  if (bills.docs.length === 0) return [];
  const settings = await payload.findGlobal({
    slug: 'visit-day-bill-settings',
    depth: 0,
    overrideAccess: true,
  });
  return buildVisitDayFinanceRows(
    bills.docs,
    settings.revenueAccount,
    settings.paymentDeadlineDays,
  );
}

/**
 * Generates the accounting import for Banana, one row per bill ever raised.
 */
export async function generateFinanceCsv(payload: Payload): Promise<string> {
  return formatFinanceCsv(await findFinanceCsvRows(payload));
}
