import type { MaterialOrderForm } from '@/features/hof-dashboard/api/material-orders';
import {
  buildMaterialOrderWorkbook,
  distinctTitles,
} from '@/features/hof-dashboard/api/material-orders-export';
import ExcelJS from 'exceljs';

const version = (
  id: string,
  submittedAt: string,
  quantities: Record<string, number>,
  remarks: { label: string; text: string }[] = [],
): MaterialOrderForm['hoefe'][number]['versions'][number] => ({
  id,
  submittedAt,
  status: 'submitted',
  final: false,
  feedback: '',
  quantities,
  remarks,
  reviewLog: [],
});

const FORM: MaterialOrderForm = {
  id: 'form-infra',
  title: 'Materialbestellung Hof-Infrastruktur',
  mode: 'versions',
  deadline: undefined,
  exportedAt: undefined,
  items: [
    { id: 'rope', name: 'Bindestrick', section: 'Allgemein' },
    { id: 'log', name: 'Baumstamm 6 m', section: 'Holz' },
  ],
  hoefe: [
    {
      hofId: 'hof-uster',
      hofName: 'Cevi Uster',
      quantities: { rope: 60, log: 4 },
      orderedAt: '2026-10-29T20:14:00.000Z',
      changedSinceExport: true,
      versions: [
        version('uster-2', '2026-10-29T20:14:00.000Z', { rope: 60, log: 4 }, [
          { label: 'Bemerkungen', text: 'Bitte gerade Stämme.' },
        ]),
        version('uster-1', '2026-10-12T18:45:00.000Z', { rope: 50, log: 8 }),
      ],
    },
    {
      hofId: 'hof-zueri',
      hofName: 'Züri 11',
      quantities: { log: 12 },
      orderedAt: '2026-10-01T10:00:00.000Z',
      changedSinceExport: true,
      versions: [version('zueri-1', '2026-10-01T10:00:00.000Z', { log: 12 })],
    },
    {
      hofId: 'hof-bubikon',
      hofName: 'Bubikon Wolfhausen',
      quantities: {},
      orderedAt: undefined,
      changedSinceExport: false,
      versions: [],
    },
  ],
};

const STADTLEBEN: MaterialOrderForm = {
  ...FORM,
  id: 'form-stadtleben',
  title: 'Materialbestellung Stadtleben',
};

const read = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
};

const rowsOf = (sheet: ExcelJS.Worksheet | undefined): unknown[][] =>
  (sheet?.getSheetValues() ?? []).flatMap((row) =>
    Array.isArray(row) ? [row.slice(1) as unknown[]] : [],
  );

describe('distinctTitles', () => {
  it('drops the words every title starts with', () => {
    expect(
      distinctTitles(['Materialbestellung Hof-Infrastruktur', 'Materialbestellung Stadtleben']),
    ).toEqual(['Hof-Infrastruktur', 'Stadtleben']);
  });

  it('keeps a lone title, and the last word of a title that is all shared', () => {
    expect(distinctTitles(['Materialbestellung Stadtleben'])).toEqual([
      'Materialbestellung Stadtleben',
    ]);
    expect(distinctTitles(['Material', 'Material Stadtleben'])).toEqual([
      'Material',
      'Material Stadtleben',
    ]);
  });
});

describe('buildMaterialOrderWorkbook', () => {
  it('adds up the newest version of every Hof per material', async () => {
    const workbook = await read(await buildMaterialOrderWorkbook([FORM], new Set(['total']), 'de'));

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Total Materialbestellung Hof-In',
    ]);
    expect(rowsOf(workbook.worksheets[0])).toEqual([
      ['Abschnitt', 'Material', 'Total', 'Höfe', 'Grösste Bestellung'],
      ['Allgemein', 'Bindestrick', 60, 1, 60],
      ['Holz', 'Baumstamm 6 m', 16, 2, 12],
    ]);
  });

  it('gives every Hof a row per form, those without an order too, and a total under them', async () => {
    const workbook = await read(
      await buildMaterialOrderWorkbook([FORM, STADTLEBEN], new Set(['perHof']), 'de'),
    );

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Pro Hof Hof-Infrastruktur',
      'Pro Hof Stadtleben',
    ]);
    expect(rowsOf(workbook.worksheets[0])).toEqual([
      ['Hof', 'Bindestrick', 'Baumstamm 6 m'],
      ['Cevi Uster', 60, 4],
      ['Züri 11', 0, 12],
      ['Bubikon Wolfhausen', 0, 0],
      ['Total', 60, 16],
    ]);
  });

  it("lists the remarks of the order that counts, and every version's lines with its date", async () => {
    const workbook = await read(
      await buildMaterialOrderWorkbook([FORM], new Set(['remarks', 'versions']), 'de'),
    );
    const [remarks, versions] = workbook.worksheets;

    expect(rowsOf(remarks).slice(1)).toEqual([
      [
        'Materialbestellung Hof-Infrastruktur',
        'Cevi Uster',
        'Bemerkungen',
        'Bitte gerade Stämme.',
        '29.10.2026, 21:14',
      ],
    ]);
    expect(
      rowsOf(versions)
        .slice(1)
        .map((row) => row.slice(1, 7)),
    ).toEqual([
      ['Cevi Uster', 2, '29.10.2026, 21:14', 'Eingereicht', 'Bindestrick', 60],
      ['Cevi Uster', 2, '29.10.2026, 21:14', 'Eingereicht', 'Baumstamm 6 m', 4],
      ['Cevi Uster', 1, '12.10.2026, 20:45', 'Eingereicht', 'Bindestrick', 50],
      ['Cevi Uster', 1, '12.10.2026, 20:45', 'Eingereicht', 'Baumstamm 6 m', 8],
      ['Züri 11', 1, '01.10.2026, 12:00', 'Eingereicht', 'Baumstamm 6 m', 12],
    ]);
  });
});
