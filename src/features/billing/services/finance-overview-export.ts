import {
  FINANCE_COLUMNS,
  findFinanceCsvRows,
} from '@/features/billing/services/csv-export-service';
import type { FinanceCsvRow } from '@/features/billing/types';
import ExcelJS from 'exceljs';
import type { Payload } from 'payload';

const COLUMN_WIDTHS: Record<keyof FinanceCsvRow, number> = {
  Date: 12,
  DocInvoice: 14,
  ExternalReference: 30,
  Amount: 12,
  DateExpiration: 14,
  Description: 60,
  AccountDebit: 14,
  AccountCredit: 14,
  Storniert: 10,
  Stornogrund: 60,
};

/**
 * Writes every bill into a workbook, with the same columns and values as the CSV export.
 *
 * The finance team imports this file into Banana, so the Banana columns keep their exact
 * headers and there is no total row, which Banana would book as one more transaction.
 * Cancelled bills are listed too, marked in `Storniert`, and have to be filtered out before
 * an import. Dates stay ISO text as in the CSV, and the reference stays text so its 27
 * digits are not rounded to a float.
 */
export async function buildFinanceOverviewWorkbook(rows: FinanceCsvRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Rechnungsübersicht');

  sheet.columns = FINANCE_COLUMNS.map((key) => ({
    header: key,
    key,
    width: COLUMN_WIDTHS[key],
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row);
  }

  sheet.getColumn('Amount').numFmt = '0.00';
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Loads every bill ever raised and renders the workbook for it. */
export async function generateFinanceOverviewWorkbook(payload: Payload): Promise<Buffer> {
  return buildFinanceOverviewWorkbook(await findFinanceCsvRows(payload));
}
