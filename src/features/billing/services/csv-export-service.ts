import { ACCOUNTED_STATUSES } from '@/features/billing/services/billing-status';
import { shortenEventName } from '@/features/billing/services/weekly-report';
import type { FinanceCsvRow } from '@/features/billing/types';
import type { BillParticipant, BillSetting } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

interface RolePricingEntry {
  roleTypePattern: string;
  label: string;
}

/**
 * The column order of the Banana import. Banana matches columns by these exact header
 * names, so they must not be translated or reworded.
 */
const CSV_HEADERS: (keyof FinanceCsvRow)[] = [
  'Date',
  'DocInvoice',
  'ExternalReference',
  'Amount',
  'DateExpiration',
  'Description',
  'AccountDebit',
  'AccountCredit',
];

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
 * Builds one Banana booking per bill.
 *
 * A bill is one line, even when it is split across several VAT rates: the booking is
 * matched against the camt.054 from the bank by its QR reference, and a payment settles the
 * whole bill. The VAT is assigned in Banana through the temporary counter account.
 */
export function buildFinanceCsvRows(
  participants: BillParticipant[],
  settings: Pick<
    BillSetting,
    'rolePricing' | 'paymentDeadlineDays' | 'accountDebit' | 'accountCredit'
  >,
): FinanceCsvRow[] {
  const rolePricing = (settings.rolePricing ?? []) as RolePricingEntry[];
  const paymentDeadlineDays = settings.paymentDeadlineDays ?? 30;

  return participants.map((participant) => {
    // The bill is dated, and its deadline runs, from the day it was raised.
    const billDate =
      typeof participant.billCreatedDate === 'string'
        ? new Date(participant.billCreatedDate)
        : new Date();
    const expirationDate = new Date(billDate);
    expirationDate.setDate(expirationDate.getDate() + paymentDeadlineDays);

    return {
      Date: formatIsoDate(billDate),
      DocInvoice: participant.invoiceNumber ?? '',
      // Banana matches this against the reference in the camt.054, which has no spaces.
      ExternalReference: (participant.referenceNumber ?? '').replaceAll(/\s/g, ''),
      Amount: participant.invoiceAmount ?? 0,
      DateExpiration: formatIsoDate(expirationDate),
      Description: [
        resolveFeeLabel(participant.roleType ?? '', rolePricing),
        participant.fullName,
        shortenEventName(participant.eventName),
      ].join(', '),
      AccountDebit: settings.accountDebit ?? '',
      AccountCredit: settings.accountCredit ?? '',
    };
  });
}

const escapeCsvValue = (value: string | number): string => {
  if (typeof value === 'number') return value.toFixed(2);
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

/**
 * Serialises the rows as a comma-separated file with a UTF-8 BOM and CRLF line endings,
 * the shape of the test file the finance team imported into Banana.
 */
export function formatFinanceCsv(rows: FinanceCsvRow[]): string {
  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map((row) => CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Generates the accounting import for Banana, one row per raised bill.
 */
export async function generateFinanceCsv(payload: Payload): Promise<string> {
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  // Every raised bill, including one the sync has since parked for manual review: it was
  // still booked, and an accounting export that quietly drops a line it emitted last week
  // is worse than one that shows a line somebody has to look at.
  const participants = await payload.find({
    collection: 'bill-participants',
    where: { status: { in: [...ACCOUNTED_STATUSES] } },
    limit: 10_000,
    sort: 'invoiceNumber',
    context: { internal: true },
  });

  return formatFinanceCsv(buildFinanceCsvRows(participants.docs, settings));
}
