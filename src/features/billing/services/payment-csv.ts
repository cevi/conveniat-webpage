/**
 * Reads the bank's CSV export of a camt.054 credit notification: one line per incoming
 * payment, with the QR reference it was paid against.
 *
 * Kept free of Payload and browser imports, so the admin panel can decode the file and the
 * server can parse it with the same code, and both can be tested on their own.
 */

/** One incoming payment, as the bank file lists it. */
export interface BankPayment {
  /** Line in the file, counting the header as line 1, so an operator can find the payment. */
  line: number;
  /** The QR reference with its spaces removed, or whatever the cell held instead. */
  reference: string;
  /** In CHF; `undefined` when the cell is not a number. */
  amount: number | undefined;
  currency: string;
  /** `YYYY-MM-DD`; `undefined` when the cell is not a date. */
  bookingDate: string | undefined;
  payer: string;
  /** The bank's id for the payment, which tells a re-imported file from a second payment. */
  transactionReference: string;
  message: string;
}

export interface ParsedPaymentCsv {
  payments: BankPayment[];
  /** Set when the file cannot be read at all; `payments` is then empty. */
  error?: string;
}

/**
 * The header of each column, lowercased. Matched exactly rather than loosely: "Referenz"
 * is a prefix of "Transaktionsreferenz", and confusing the two would book nothing.
 */
const COLUMNS = {
  reference: ['referenz'],
  amount: ['betrag'],
  currency: ['währung', 'waehrung'],
  bookingDate: ['buchungsdatum'],
  payer: ['zahlungspflichtiger'],
  transactionReference: ['transaktionsreferenz'],
  message: ['mitteilung'],
} as const;

type ColumnKey = keyof typeof COLUMNS;

const REQUIRED_COLUMNS: ColumnKey[] = ['reference', 'amount'];

const DELIMITERS = ['\t', ';', ','] as const;

/**
 * Turns the uploaded bytes into text.
 *
 * Excel saves "Unicode text" as UTF-16 and a plain CSV as Windows-1252, while the e-banking
 * export is UTF-8. Reading any of them as UTF-8 would garble the payers' names, so the byte
 * order mark decides, and a file that is not valid UTF-8 is read as Windows-1252.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Splits delimited text into rows of cells, honouring quotes and doubled quotes. */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** The delimiter that splits the header line into the most cells. */
function detectDelimiter(headerLine: string): string {
  let best: string = DELIMITERS[0];
  let bestCount = -1;
  for (const delimiter of DELIMITERS) {
    const count = headerLine.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Reads an amount the way Swiss exports write it: `330`, `330.00`, `330,00` or `1'274.50`.
 */
export function parseAmount(raw: string): number | undefined {
  let value = raw.replaceAll(/[\s'’]/g, '');
  if (value === '') return undefined;
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  // Whichever separator comes last is the decimal one; the other groups thousands.
  value =
    lastComma > lastDot ? value.replaceAll('.', '').replace(',', '.') : value.replaceAll(',', '');
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
  return Number.parseFloat(value);
}

/** Reads `08.10.2026` or `2026-10-08` as `2026-10-08`. */
export function parseBookingDate(raw: string): string | undefined {
  const value = raw.trim();
  const swiss = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (swiss !== null) {
    const [, day = '', month = '', year = ''] = swiss;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
}

/**
 * Parses the bank's payment CSV.
 *
 * The columns are found by their header, so the order may change and extra columns are
 * ignored. Tab, semicolon and comma separated files are all accepted, because the file
 * passes through whatever the finance team opens it with.
 */
export function parsePaymentCsv(text: string): ParsedPaymentCsv {
  const content = text.replace(/^\uFEFF/, '');
  const firstLineEnd = content.search(/\r?\n/);
  const headerLine = firstLineEnd === -1 ? content : content.slice(0, firstLineEnd);
  const rows = splitRows(content, detectDelimiter(headerLine));

  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const indexOf = Object.fromEntries(
    (Object.keys(COLUMNS) as ColumnKey[]).map((key) => [
      key,
      header.findIndex((name) => (COLUMNS[key] as readonly string[]).includes(name)),
    ]),
  ) as Record<ColumnKey, number>;

  const missing = REQUIRED_COLUMNS.filter((key) => indexOf[key] === -1);
  if (missing.length > 0) {
    return {
      payments: [],
      error:
        `Die Datei hat keine Spalte ${missing.map((key) => `«${COLUMNS[key][0]}»`).join(' und ')}. ` +
        'Erwartet wird der CSV-Export der camt.054-Gutschriften mit den Spalten Referenz und Betrag.',
    };
  }

  const payments: BankPayment[] = [];
  for (const [index, row] of rows.entries()) {
    if (index === 0 || row.every((cell) => cell.trim() === '')) continue;
    const cell = (key: ColumnKey): string => {
      const column = indexOf[key];
      return column === -1 ? '' : (row[column] ?? '').trim();
    };

    payments.push({
      line: index + 1,
      reference: cell('reference').replaceAll(/\s/g, ''),
      amount: parseAmount(cell('amount')),
      currency: cell('currency').toUpperCase(),
      bookingDate: parseBookingDate(cell('bookingDate')),
      payer: cell('payer'),
      transactionReference: cell('transactionReference'),
      message: cell('message'),
    });
  }

  return { payments };
}
