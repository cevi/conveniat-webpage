import type {
  MaterialOrderForm,
  MaterialOrderVersion,
} from '@/features/hof-dashboard/api/material-orders';
import { HOF_ENTRY_STATUS_LABELS } from '@/features/hof-dashboard/constants';
import { formatDateTime, translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import ExcelJS from 'exceljs';

/** The sheets an export can hold, one set per form. */
export const MATERIAL_EXPORT_SHEETS = ['total', 'perHof', 'remarks', 'versions'] as const;

export type MaterialExportSheet = (typeof MATERIAL_EXPORT_SHEETS)[number];

/** Excel refuses longer sheet names and these characters in them. */
const SHEET_NAME_LENGTH = 31;
const FORBIDDEN_IN_SHEET_NAME = /[\\/?*:[\]]/g;

/**
 * The form titles without the words they all start with, so "Materialbestellung
 * Hof-Infrastruktur" and "Materialbestellung Stadtleben" name their sheets by what differs.
 */
export const distinctTitles = (titles: readonly string[]): string[] => {
  if (titles.length < 2) return [...titles];
  const words = titles.map((title) => title.split(/\s+/));
  let common = 0;
  while (
    words.every((title) => title.length > common + 1 && title[common] === words[0]?.[common])
  ) {
    common += 1;
  }
  return words.map((title) => title.slice(common).join(' '));
};

/** A sheet name Excel takes, made unique among those already used. */
const sheetName = (name: string, used: Set<string>): string => {
  const clean = name.replaceAll(FORBIDDEN_IN_SHEET_NAME, '-').trim();
  let candidate = clean.slice(0, SHEET_NAME_LENGTH);
  for (let n = 2; used.has(candidate.toLowerCase()); n += 1) {
    const suffix = ` (${n})`;
    candidate = `${clean.slice(0, SHEET_NAME_LENGTH - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

/** The submissions of a Hof that count: of versions the newest, of entries every one. */
const countedVersions = (
  form: MaterialOrderForm,
  versions: readonly MaterialOrderVersion[],
): readonly MaterialOrderVersion[] => (form.mode === 'entries' ? versions : versions.slice(0, 1));

const boldHeader = (sheet: ExcelJS.Worksheet): void => {
  sheet.getRow(1).font = { bold: true };
};

const addTotalSheet = (
  workbook: ExcelJS.Workbook,
  form: MaterialOrderForm,
  name: string,
  locale: Locale,
): void => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: translate('xlsxSection', locale), width: 16 },
    { header: translate('xlsxMaterial', locale), width: 40 },
    { header: translate('xlsxTotal', locale), width: 10 },
    { header: translate('xlsxHoefe', locale), width: 10 },
    { header: translate('xlsxLargest', locale), width: 16 },
  ];
  for (const item of form.items) {
    const quantities = form.hoefe
      .map((hof) => hof.quantities[item.id] ?? 0)
      .filter((quantity) => quantity > 0);
    sheet.addRow([
      item.section ?? '',
      item.name,
      quantities.reduce((sum, quantity) => sum + quantity, 0),
      quantities.length,
      quantities.length === 0 ? 0 : Math.max(...quantities),
    ]);
  }
  boldHeader(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
};

const addPerHofSheet = (
  workbook: ExcelJS.Workbook,
  form: MaterialOrderForm,
  name: string,
  locale: Locale,
): void => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: translate('hof', locale), width: 32 },
    ...form.items.map((item) => ({ header: item.name, width: 14 })),
  ];
  // every Hof, those without an order too, so nobody is missed at the handout
  for (const hof of form.hoefe) {
    sheet.addRow([hof.hofName, ...form.items.map((item) => hof.quantities[item.id] ?? 0)]);
  }
  const total = sheet.addRow([
    translate('xlsxTotal', locale),
    ...form.items.map((item) =>
      form.hoefe.reduce((sum, hof) => sum + (hof.quantities[item.id] ?? 0), 0),
    ),
  ]);
  total.font = { bold: true };
  boldHeader(sheet);
  sheet.getRow(1).alignment = { wrapText: true, vertical: 'top' };
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
};

const addRemarksSheet = (
  workbook: ExcelJS.Workbook,
  forms: readonly MaterialOrderForm[],
  name: string,
  locale: Locale,
): void => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: translate('xlsxForm', locale), width: 30 },
    { header: translate('hof', locale), width: 32 },
    { header: translate('xlsxQuestion', locale), width: 30 },
    { header: translate('xlsxAnswer', locale), width: 60 },
    { header: translate('xlsxSubmittedAt', locale), width: 18 },
  ];
  for (const form of forms) {
    for (const hof of form.hoefe) {
      for (const version of countedVersions(form, hof.versions)) {
        for (const remark of version.remarks) {
          sheet.addRow([
            form.title,
            hof.hofName,
            remark.label,
            remark.text,
            formatDateTime(version.submittedAt, locale),
          ]);
        }
      }
    }
  }
  boldHeader(sheet);
  sheet.getColumn(4).alignment = { wrapText: true, vertical: 'top' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
};

const addVersionsSheet = (
  workbook: ExcelJS.Workbook,
  forms: readonly MaterialOrderForm[],
  name: string,
  locale: Locale,
): void => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: translate('xlsxForm', locale), width: 30 },
    { header: translate('hof', locale), width: 32 },
    { header: translate('xlsxVersion', locale), width: 10 },
    { header: translate('xlsxSubmittedAt', locale), width: 18 },
    { header: translate('reviewStatus', locale), width: 26 },
    { header: translate('xlsxMaterial', locale), width: 40 },
    { header: translate('xlsxQuantity', locale), width: 10 },
  ];
  for (const form of forms) {
    const names = new Map(form.items.map((item) => [item.id, item.name]));
    for (const hof of form.hoefe) {
      for (const [index, version] of hof.versions.entries()) {
        const number = hof.versions.length - index;
        for (const [id, quantity] of Object.entries(version.quantities)) {
          sheet.addRow([
            form.title,
            hof.hofName,
            number,
            formatDateTime(version.submittedAt, locale),
            HOF_ENTRY_STATUS_LABELS[version.status][locale],
            names.get(id) ?? id,
            quantity,
          ]);
        }
      }
    }
  }
  boldHeader(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
};

/**
 * The material orders as a workbook for the Ressort: per form the total of every material and
 * what each Hof gets, then the Höfe's remarks and, if asked for, every version with its date.
 * Only what counts goes into the totals: the newest version of each Hof's order.
 */
export const buildMaterialOrderWorkbook = async (
  forms: readonly MaterialOrderForm[],
  sheets: ReadonlySet<MaterialExportSheet>,
  locale: Locale,
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const used = new Set<string>();
  const titles = distinctTitles(forms.map((form) => form.title));

  for (const [index, form] of forms.entries()) {
    const title = titles[index] ?? form.title;
    if (sheets.has('total')) {
      addTotalSheet(
        workbook,
        form,
        sheetName(`${translate('xlsxTotal', locale)} ${title}`, used),
        locale,
      );
    }
    if (sheets.has('perHof')) {
      addPerHofSheet(
        workbook,
        form,
        sheetName(`${translate('xlsxPerHof', locale)} ${title}`, used),
        locale,
      );
    }
  }
  if (sheets.has('remarks')) {
    addRemarksSheet(workbook, forms, sheetName(translate('remarks', locale), used), locale);
  }
  if (sheets.has('versions')) {
    addVersionsSheet(workbook, forms, sheetName(translate('xlsxVersions', locale), used), locale);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
