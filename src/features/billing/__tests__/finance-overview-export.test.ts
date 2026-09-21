import {
  buildFinanceOverviewRows,
  buildFinanceOverviewWorkbook,
} from '@/features/billing/services/finance-overview-export';
import type { BillParticipant, BillSetting } from '@/features/payload-cms/payload-types';
import ExcelJS from 'exceljs';

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    fullName: 'Max Mustermann',
    invoiceNumber: '2027-0001',
    referenceNumber: '96 12345 67890',
    invoiceAmount: 250,
    eventName: 'Hauptlager conveniat27 - Bern',
    roleType: 'Event::Role::Participant',
    status: 'bill_sent',
    billCreatedDate: '2026-08-22T00:00:00.000Z',
    billSentDate: '2026-08-23T00:00:00.000Z',
    ...overrides,
  }) as unknown as BillParticipant;

const settings = (overrides: Partial<BillSetting> = {}): BillSetting =>
  ({
    paymentDeadlineDays: 30,
    rolePricing: [
      { roleTypePattern: 'Participant', label: 'Teilnehmer:in' },
      { roleTypePattern: 'Leader', label: 'Leiter:in' },
    ],
    ...overrides,
  }) as unknown as BillSetting;

describe('buildFinanceOverviewRows', () => {
  it('derives the due date from the bill date and the configured deadline', () => {
    const [row] = buildFinanceOverviewRows([participant({})], settings());

    // 22.08. + 30 days — the same deadline that is printed on the bill itself.
    expect(row?.dueDate?.toISOString().slice(0, 10)).toBe('2026-09-21');
    expect(row?.sentDate?.toISOString().slice(0, 10)).toBe('2026-08-23');
  });

  it('labels the role the way the bill settings do, not the way Hitobito does', () => {
    const rows = buildFinanceOverviewRows(
      [
        participant({ roleType: 'Event::Role::Participant' }),
        participant({ roleType: 'Event::Role::Leader' }),
        // A role with no configured pricing still has to read as something.
        participant({ roleType: 'Event::Role::Cook' }),
      ],
      settings(),
    );

    expect(rows.map((row) => row.role)).toEqual(['Teilnehmer:in', 'Leiter:in', 'Cook']);
  });

  it('leaves the dates empty rather than inventing them when a bill was never sent', () => {
    const [row] = buildFinanceOverviewRows(
      // eslint-disable-next-line unicorn/no-null -- Payload stores an unset date as null.
      [participant({ billCreatedDate: null, billSentDate: null })],
      settings(),
    );

    expect(row?.dueDate).toBeUndefined();
    expect(row?.sentDate).toBeUndefined();
  });

  it('carries the finance note through and translates the status', () => {
    const [row] = buildFinanceOverviewRows(
      [participant({ status: 'reminder_sent', financeNote: 'Zahlt in Raten' })],
      settings(),
    );

    expect(row?.status).toBe('Mahnung gesendet');
    expect(row?.note).toBe('Zahlt in Raten');
  });

  it('falls back to a 30 day deadline when the setting is missing', () => {
    const [row] = buildFinanceOverviewRows(
      [participant({})],
      // eslint-disable-next-line unicorn/no-null -- Payload stores an unset number as null.
      settings({ paymentDeadlineDays: null }),
    );

    expect(row?.dueDate?.toISOString().slice(0, 10)).toBe('2026-09-21');
  });
});

/**
 * exceljs types `load` against a plain `ArrayBuffer`, but accepts a Node `Buffer` at
 * runtime — which is what the endpoint actually hands to the browser. The cast lives
 * here so the tests read the same bytes the finance team downloads.
 */
const loadWorkbook = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
};

describe('buildFinanceOverviewWorkbook', () => {
  it('writes amounts and dates as real cells, not as pre-formatted text', async () => {
    const rows = buildFinanceOverviewRows([participant({})], settings());
    const workbook = await loadWorkbook(await buildFinanceOverviewWorkbook(rows, 'CHF'));
    const sheet = workbook.getWorksheet('Rechnungsübersicht');
    expect(sheet).toBeDefined();

    expect(sheet?.getRow(1).values).toEqual(
      expect.arrayContaining(['Voller Name', 'Rechnung Nr.', 'Referenz Nr.', 'Betrag']),
    );

    const dataRow = sheet?.getRow(2);
    expect(dataRow?.getCell(1).value).toBe('Max Mustermann');
    // A number and a Date, so the finance team can sort and total without re-typing.
    expect(dataRow?.getCell(4).value).toBe(250);
    expect(dataRow?.getCell(9).value).toBeInstanceOf(Date);
  });

  it('closes with a total row over the amounts', async () => {
    const rows = buildFinanceOverviewRows(
      [participant({ invoiceAmount: 250 }), participant({ invoiceAmount: 50 })],
      settings(),
    );
    const workbook = await loadWorkbook(await buildFinanceOverviewWorkbook(rows, 'CHF'));
    const sheet = workbook.getWorksheet('Rechnungsübersicht');

    // Header + two bills + total.
    expect(sheet?.rowCount).toBe(4);
    expect(sheet?.getRow(4).getCell(1).value).toBe('Total');
    expect(sheet?.getRow(4).getCell(4).value).toBe(300);
  });

  it('produces a readable sheet when there is nothing to bill yet', async () => {
    const workbook = await loadWorkbook(await buildFinanceOverviewWorkbook([], 'CHF'));
    const sheet = workbook.getWorksheet('Rechnungsübersicht');

    // Headers only — and crucially no "Total" row claiming a total of nothing.
    expect(sheet?.rowCount).toBe(1);
  });
});
