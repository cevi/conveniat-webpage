import {
  decodeCsvBytes,
  parseAmount,
  parseBookingDate,
  parsePaymentCsv,
} from '@/features/billing/services/payment-csv';

/** The export as the finance team receives it: tab separated, one payment per line. */
const bankExport = [
  'Datei\tReferenz\tBetrag\tWährung\tBuchungsdatum\tValutadatum\tZahlungspflichtiger\tTransaktionsreferenz\tZahlungsinformation\tMitteilung',
  'camt054_beispiel.xml\t090000123012340000567000010\t330\tCHF\t08.10.2026\t08.10.2026\tLea Muster\tGS00000000000001\tCH0000000000000000000\t',
].join('\r\n');

describe('parsePaymentCsv', () => {
  it('reads a payment from the tab-separated bank export', () => {
    const { payments, error } = parsePaymentCsv(bankExport);

    expect(error).toBeUndefined();
    expect(payments).toEqual([
      {
        line: 2,
        reference: '090000123012340000567000010',
        amount: 330,
        currency: 'CHF',
        bookingDate: '2026-10-08',
        payer: 'Lea Muster',
        transactionReference: 'GS00000000000001',
        message: '',
      },
    ]);
  });

  it('finds the columns by header in a semicolon file with quotes and a byte order mark', () => {
    const csv = [
      '\uFEFFMitteilung;Betrag;Referenz;Zahlungspflichtiger;Transaktionsreferenz',
      '"Lager; Cevi Uster";"1\'274,50";"09 00001 23012 34000 05670 00010";"Muster ""Gecko"" Max";GS00000000000001',
    ].join('\n');

    const [payment] = parsePaymentCsv(csv).payments;

    expect(payment?.reference).toBe('090000123012340000567000010');
    expect(payment?.amount).toBe(1274.5);
    expect(payment?.message).toBe('Lager; Cevi Uster');
    expect(payment?.payer).toBe('Muster "Gecko" Max');
  });

  it('skips empty lines', () => {
    expect(parsePaymentCsv(`${bankExport}\r\n\r\n`).payments).toHaveLength(1);
  });

  it('refuses a file without a reference column instead of booking nothing silently', () => {
    const { payments, error } = parsePaymentCsv('Datum;Betrag\n08.10.2026;330');

    expect(payments).toEqual([]);
    expect(error).toContain('«referenz»');
  });

  it('refuses a file without a Transaktionsreferenz, which every booking has to name', () => {
    const { payments, error } = parsePaymentCsv('Referenz;Betrag\n090000123012340000567000010;330');

    expect(payments).toEqual([]);
    expect(error).toContain('«transaktionsreferenz»');
  });

  it('does not take the Transaktionsreferenz for the Referenz', () => {
    const { error } = parsePaymentCsv('Transaktionsreferenz;Betrag\nGS1;330');

    expect(error).toContain('«referenz»');
  });
});

describe('parseAmount', () => {
  it.each([
    ['330', 330],
    ['330.00', 330],
    ['330,50', 330.5],
    ["1'274.50", 1274.5],
    ['1.274,50', 1274.5],
    ['1,274.50', 1274.5],
  ])('reads %s', (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it('gives up on anything that is not a number', () => {
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('CHF 330')).toBeUndefined();
  });
});

describe('parseBookingDate', () => {
  it('reads Swiss and ISO dates', () => {
    expect(parseBookingDate('8.10.2026')).toBe('2026-10-08');
    expect(parseBookingDate('2026-10-08')).toBe('2026-10-08');
    expect(parseBookingDate('morgen')).toBeUndefined();
  });
});

describe('decodeCsvBytes', () => {
  it('reads UTF-8', () => {
    expect(decodeCsvBytes(new TextEncoder().encode('Züri'))).toBe('Züri');
  });

  it('reads the UTF-16 that Excel saves as Unicode text', () => {
    const text = '\uFEFFZüri';
    const bytes = new Uint8Array(text.length * 2);
    for (const [index, char] of [...text].entries()) {
      const code = char.codePointAt(0) ?? 0;
      bytes[index * 2] = code & 0xff;
      bytes[index * 2 + 1] = code >> 8;
    }

    expect(decodeCsvBytes(bytes).replace(/^\uFEFF/, '')).toBe('Züri');
  });

  it('falls back to Windows-1252 for a file that is not UTF-8', () => {
    // "Züri" with ü as the single byte 0xFC.
    expect(decodeCsvBytes(new Uint8Array([0x5a, 0xfc, 0x72, 0x69]))).toBe('Züri');
  });
});
