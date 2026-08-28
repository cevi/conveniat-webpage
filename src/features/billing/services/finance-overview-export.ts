import type { BillParticipant, BillSetting } from '@/features/payload-cms/payload-types';
import ExcelJS from 'exceljs';
import type { Payload } from 'payload';

/** Statuses that mean a bill exists — the only rows the finance overview is about. */
const BILLED_STATUSES = ['bill_created', 'bill_sent', 'reminder_sent'] as const;

const STATUS_LABELS: Record<string, string> = {
  bill_created: 'Rechnung erstellt',
  bill_sent: 'Rechnung gesendet',
  reminder_sent: 'Mahnung gesendet',
};

interface RolePricingEntry {
  roleTypePattern: string;
  label: string;
}

/**
 * Turns Hitobito's role identifier into the label configured in the bill settings, which
 * is the wording the finance team already sees on the invoices themselves.
 */
const resolveRoleLabel = (roleType: string, rolePricing: RolePricingEntry[]): string => {
  const match = rolePricing.find((pricing) =>
    roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase()),
  );
  if (match !== undefined) return match.label;
  // Fall back to the bare Hitobito suffix: `Event::Role::Participant` reads as `Participant`.
  return roleType.split('::').at(-1) ?? roleType;
};

const toDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export interface FinanceOverviewRow {
  fullName: string;
  invoiceNumber: string;
  referenceNumber: string;
  amount: number;
  eventName: string;
  role: string;
  status: string;
  note: string;
  dueDate: Date | undefined;
  sentDate: Date | undefined;
}

/**
 * Builds the rows behind the finance overview.
 *
 * Kept separate from the workbook so the mapping — which due date applies, how a role is
 * labelled, what counts as billed — can be tested without going through ExcelJS.
 */
export function buildFinanceOverviewRows(
  participants: BillParticipant[],
  settings: Pick<BillSetting, 'rolePricing' | 'paymentDeadlineDays'>,
): FinanceOverviewRow[] {
  const rolePricing = (settings.rolePricing ?? []) as RolePricingEntry[];
  const paymentDeadlineDays = settings.paymentDeadlineDays ?? 30;

  return participants.map((participant) => {
    const billCreated = toDate(participant.billCreatedDate);
    const roleType = participant.roleType ?? '';
    const { status } = participant;

    return {
      fullName: participant.fullName,
      invoiceNumber: participant.invoiceNumber ?? '',
      referenceNumber: participant.referenceNumber ?? '',
      amount: participant.invoiceAmount ?? 0,
      eventName: participant.eventName ?? '',
      role: resolveRoleLabel(roleType, rolePricing),
      status: STATUS_LABELS[status] ?? status,
      note: participant.financeNote ?? '',
      // The deadline runs from the day the bill was raised, matching what is printed on it.
      dueDate: billCreated === undefined ? undefined : addDays(billCreated, paymentDeadlineDays),
      sentDate: toDate(participant.billSentDate),
    };
  });
}

const COLUMNS: Array<{ header: string; key: keyof FinanceOverviewRow; width: number }> = [
  { header: 'Voller Name', key: 'fullName', width: 28 },
  { header: 'Rechnung Nr.', key: 'invoiceNumber', width: 16 },
  { header: 'Referenz Nr.', key: 'referenceNumber', width: 32 },
  { header: 'Betrag', key: 'amount', width: 12 },
  { header: 'Anlass', key: 'eventName', width: 34 },
  { header: 'Rolle', key: 'role', width: 16 },
  { header: 'Status', key: 'status', width: 20 },
  { header: 'Bemerkung', key: 'note', width: 40 },
  { header: 'Fällig am', key: 'dueDate', width: 14 },
  { header: 'Gesendet am', key: 'sentDate', width: 14 },
];

/**
 * Writes the overview rows into a workbook.
 *
 * Amounts and dates are written as real currency and date cells rather than as formatted
 * strings, so the finance team can sort, filter and total them without re-typing.
 */
export async function buildFinanceOverviewWorkbook(
  rows: FinanceOverviewRow[],
  currency: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Rechnungsübersicht');

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const amountFormat = `#,##0.00 "${currency}"`;
  sheet.getColumn('amount').numFmt = amountFormat;
  sheet.getColumn('dueDate').numFmt = 'dd.mm.yyyy';
  sheet.getColumn('sentDate').numFmt = 'dd.mm.yyyy';

  // Freeze the header and switch on autofilter: at a few hundred rows this is the
  // difference between a report and a wall of numbers.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  // A total the finance team would otherwise add up by hand on every download.
  if (rows.length > 0) {
    const totalRow = sheet.addRow({
      fullName: 'Total',
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
    });
    totalRow.font = { bold: true };
    totalRow.getCell('amount').numFmt = amountFormat;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Loads every raised bill and renders the finance overview workbook for it. */
export async function generateFinanceOverviewWorkbook(payload: Payload): Promise<Buffer> {
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  const participants = await payload.find({
    collection: 'bill-participants',
    where: { status: { in: [...BILLED_STATUSES] } },
    limit: 10_000,
    sort: 'invoiceNumber',
    context: { internal: true },
  });

  const rows = buildFinanceOverviewRows(participants.docs, settings);
  return buildFinanceOverviewWorkbook(rows, settings.currency ?? 'CHF');
}
