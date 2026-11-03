import ExcelJS from 'exceljs';

export interface ExportVisitor {
  id: string;
  /** e.g. "5321-B007" */
  registrationNumber: string;
  submissionId: string;
  personNumber: number;
  /** null for a visitor without a Hof */
  hofId: string | null;
  /** `YYYY-MM-DD` */
  date: string;
}

export interface ExportSubmission {
  createdAt: string;
  answers: { field: string; value: unknown }[];
}

const NO_HOF_LABEL = 'Ohne Bezug zu einem Hof';

const PERSON_SUFFIX = /^(.+)_(\d+)$/;

const FIXED_COLUMNS = [
  'Anmeldenummer',
  'Person',
  'Besucher-ID',
  'Besuchstag',
  'Hof',
  'Angemeldet am',
  'Formular-Eintrag',
];

/**
 * One row per visitor. A registration's answers are shared by all its persons, except those
 * ending in a person's number: `allergien_2` is person 2's, and shows as `allergien` on their row
 * only. The answer columns follow the order the answers first appear in.
 */
export const buildVisitorRows = (
  visitors: ExportVisitor[],
  submissions: Map<string, ExportSubmission>,
  hofNames: Map<string, string>,
): { columns: string[]; rows: Record<string, string | number>[] } => {
  const answerColumns: string[] = [];
  const rows = visitors.map((visitor) => {
    const submission = submissions.get(visitor.submissionId);
    const row: Record<string, string | number> = {
      Anmeldenummer: visitor.registrationNumber,
      Person: visitor.personNumber,
      'Besucher-ID': visitor.id,
      Besuchstag: visitor.date,
      Hof: visitor.hofId === null ? NO_HOF_LABEL : (hofNames.get(visitor.hofId) ?? visitor.hofId),
      'Angemeldet am': submission?.createdAt.slice(0, 10) ?? '',
      'Formular-Eintrag': visitor.submissionId,
    };
    for (const answer of submission?.answers ?? []) {
      const match = PERSON_SUFFIX.exec(answer.field);
      if (match !== null && Number(match[2]) !== visitor.personNumber) continue;
      const column = match?.[1] ?? answer.field;
      if (!answerColumns.includes(column)) answerColumns.push(column);
      row[column] = typeof answer.value === 'string' ? answer.value : JSON.stringify(answer.value);
    }
    return row;
  });
  return { columns: [...FIXED_COLUMNS, ...answerColumns], rows };
};

/** The visitor list as a workbook, one sheet, the header row frozen. */
export const buildVisitorWorkbook = async (
  visitors: ExportVisitor[],
  submissions: Map<string, ExportSubmission>,
  hofNames: Map<string, string>,
): Promise<Buffer> => {
  const { columns, rows } = buildVisitorRows(visitors, submissions, hofNames);
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Besuchende');
  sheet.columns = columns.map((column) => ({ header: column, key: column, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
};
