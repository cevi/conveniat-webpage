import type { VisitDayBill } from '@/features/payload-cms/payload-types';
import { VISIT_DAY_BILL_STATUS_LABELS } from '@/features/visit-day/billing/visit-day-bill-status';
import ExcelJS from 'exceljs';

/** What the address export needs of a bill. */
export type AddressBill = Pick<
  VisitDayBill,
  | 'registrationNumber'
  | 'fullName'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'persons'
  | 'status'
  | 'travelPasses'
>;

/** The travel passes the form offers, in the order the export lists them. */
const KNOWN_PASSES: { value: string; column: string }[] = [
  { value: 'ga', column: 'GA' },
  { value: 'halbtax', column: 'Halbtax' },
  { value: 'kein_abo', column: 'kein Abo' },
  { value: 'unter_6', column: 'unter 6 Jahre' },
];

const normalize = (value: string | null | undefined): string =>
  (value ?? '').trim().replaceAll(/\s+/g, ' ').toLowerCase();

const OTHER_PASS = 'anderes / ohne Angabe';

/** Whether the registrations at one address are paid: all, some or none. */
const paidLabel = (paid: boolean[]): string => {
  if (paid.every(Boolean)) return 'ja';
  return paid.some(Boolean) ? 'teilweise' : 'nein';
};

/** One row of the address export, its columns as the workbook names them. */
export type AddressRow = Record<string, string | number>;

interface AddressGroup {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  tickets: number;
  passes: Map<string, number>;
  numbers: string[];
  paid: boolean[];
}

/**
 * One row per postal address, for the rail tickets sent by letter: how many tickets go there,
 * by travel pass, and from which registrations. Two registrations at the same address, written
 * alike but for case and spaces, are one row. A cancelled registration gets no ticket.
 */
export const buildAddressRows = (bills: AddressBill[]): AddressRow[] => {
  const groups = new Map<string, AddressGroup>();
  for (const bill of bills) {
    if (bill.status === 'cancelled') continue;
    const key = [bill.street, bill.postalCode, bill.city].map((part) => normalize(part)).join('|');
    const group = groups.get(key) ?? {
      name: bill.fullName ?? '',
      street: bill.street ?? '',
      postalCode: bill.postalCode ?? '',
      city: bill.city ?? '',
      tickets: 0,
      passes: new Map<string, number>(),
      numbers: [],
      paid: [],
    };
    group.tickets += bill.persons;
    const passes = bill.travelPasses ?? [];
    for (let index = 0; index < bill.persons; index++) {
      const pass = passes[index]?.pass ?? '';
      const column = KNOWN_PASSES.find((known) => known.value === pass)?.column ?? OTHER_PASS;
      group.passes.set(column, (group.passes.get(column) ?? 0) + 1);
    }
    group.numbers.push(bill.registrationNumber);
    group.paid.push(bill.status === 'paid');
    groups.set(key, group);
  }
  return [...groups.values()]
    .toSorted(
      (a, b) => a.postalCode.localeCompare(b.postalCode) || a.street.localeCompare(b.street, 'de'),
    )
    .map((group) => ({
      Name: group.name,
      Strasse: group.street,
      PLZ: group.postalCode,
      Ort: group.city,
      Billette: group.tickets,
      ...Object.fromEntries(
        [...KNOWN_PASSES.map((pass) => pass.column), OTHER_PASS].map((column) => [
          column,
          group.passes.get(column) ?? 0,
        ]),
      ),
      Anmeldungen: group.numbers.join(', '),
      Bezahlt: paidLabel(group.paid),
    }));
};

const toWorkbook = async (
  sheetName: string,
  rows: Record<string, string | number>[],
  columns: string[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({ header: column, key: column, width: 18 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

/** The rail tickets per postal address as a workbook. */
export const buildAddressWorkbook = async (bills: AddressBill[]): Promise<Buffer> => {
  const rows = buildAddressRows(bills);
  return toWorkbook('SBB-Billette', rows, [
    'Name',
    'Strasse',
    'PLZ',
    'Ort',
    'Billette',
    ...KNOWN_PASSES.map((pass) => pass.column),
    OTHER_PASS,
    'Anmeldungen',
    'Bezahlt',
  ]);
};

/** Every Besuchstag bill as a workbook, one row per bill, for finance. */
export const buildBillsWorkbook = async (bills: VisitDayBill[]): Promise<Buffer> => {
  const rows = bills.map((bill) => ({
    Anmeldenummer: bill.registrationNumber,
    Rechnungsnummer: bill.invoiceNumber,
    Referenz: bill.referenceNumber,
    Name: bill.fullName ?? '',
    'E-Mail': bill.email ?? '',
    Besuchstag: bill.visitDate.slice(0, 10),
    Personen: bill.persons,
    Mittagessen: bill.withLunch === true ? 'ja' : 'nein',
    'Betrag (CHF)': bill.invoiceAmount,
    'MWST (CHF)': bill.vatAmount ?? 0,
    Status: VISIT_DAY_BILL_STATUS_LABELS[bill.status].de,
    'Bezahlt am': bill.paidDate?.slice(0, 10) ?? '',
    'Bezahlt (CHF)': bill.paidAmount ?? 0,
    'Rückerstattung offen (CHF)': bill.refundDue ?? 0,
    Sprache: bill.locale,
  }));
  return toWorkbook('Besuchstag-Rechnungen', rows, Object.keys(rows[0] ?? { Anmeldenummer: '' }));
};
