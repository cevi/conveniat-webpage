import {
  buildFinanceCsvRows,
  formatFinanceCsv,
} from '@/features/billing/services/csv-export-service';
import { buildFinanceOverviewWorkbook } from '@/features/billing/services/finance-overview-export';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import ExcelJS from 'exceljs';

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    fullName: 'Max Mustermann',
    invoiceNumber: '2027-0001',
    referenceNumber: '21 00000 00031 39471 43000 12345',
    invoiceAmount: 250,
    eventName: 'Hauptlager conveniat27 - Bern',
    roleType: 'Event::Role::Participant',
    status: 'bill_sent',
    billCreatedDate: '2026-08-22T08:00:00.000Z',
    ...overrides,
  }) as unknown as BillParticipant;

const SETTINGS = {
  accountDebit: '11000',
  accountCredit: '[CA]',
  paymentDeadlineDays: 30,
  rolePricing: [{ roleTypePattern: 'Participant', label: 'Teilnehmendenbeitrag', amount: 250 }],
};

/**
 * exceljs types `load` against a plain `ArrayBuffer`, but accepts a Node `Buffer` at
 * runtime — which is what the endpoint actually hands to the browser. The cast lives
 * here so the tests read the same bytes the finance team downloads.
 */
const loadSheet = async (buffer: Buffer): Promise<ExcelJS.Worksheet | undefined> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook.worksheets[0];
};

/** A row's cells from the first column on; exceljs puts nothing at index 0. */
const cells = (sheet: ExcelJS.Worksheet | undefined, row: number): unknown[] =>
  (sheet?.getRow(row).values as unknown[]).slice(1);

describe('buildFinanceOverviewWorkbook', () => {
  it('heads the sheet with exactly the header line of the Banana CSV', async () => {
    const rows = buildFinanceCsvRows([participant({})], SETTINGS);
    const sheet = await loadSheet(await buildFinanceOverviewWorkbook(rows));

    // Banana matches columns by name, so the sheet has to say what the CSV says, in order.
    const csvHeader = formatFinanceCsv([]).replace('﻿', '').trim().split(',');
    expect(cells(sheet, 1)).toEqual(csvHeader);
  });

  it('carries the same values as the CSV booking', async () => {
    const rows = buildFinanceCsvRows([participant({})], SETTINGS);
    const sheet = await loadSheet(await buildFinanceOverviewWorkbook(rows));

    expect(cells(sheet, 2)).toEqual([
      '2026-08-22',
      '2027-0001',
      // Text, not a number: 27 digits would be rounded as a float.
      '210000000031394714300012345',
      250,
      '2026-09-21',
      'Teilnehmendenbeitrag, Max Mustermann, Bern',
      '11000',
      '[CA]',
    ]);
  });

  it('writes one row per bill and no total row Banana would book', async () => {
    const rows = buildFinanceCsvRows(
      [participant({ invoiceAmount: 250 }), participant({ invoiceAmount: 50 })],
      SETTINGS,
    );
    const sheet = await loadSheet(await buildFinanceOverviewWorkbook(rows));

    expect(sheet?.rowCount).toBe(3);
  });

  it('writes the header alone when there is nothing billed yet', async () => {
    const sheet = await loadSheet(await buildFinanceOverviewWorkbook([]));

    expect(sheet?.rowCount).toBe(1);
  });
});
