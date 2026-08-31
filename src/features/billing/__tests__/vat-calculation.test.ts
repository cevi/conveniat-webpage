/* eslint-disable unicorn/no-null, unicorn/no-useless-undefined -- these cases exist precisely to pin down what happens when Cevi.DB has no birthday
   on file and the settings carry no rate. */
import {
  calculateVat,
  formatVatLineLabel,
  isVatExempt,
  parseBirthYear,
  parseVatRate,
  resolveReferenceYear,
  resolveVatSplits,
} from '@/features/billing/services/vat-calculation';

const CAMP_SPLIT = [
  { label: 'Beherbergung', share: 50, vatCode: '3.8%' },
  { label: 'Übrige Leistungen', share: 50, vatCode: '8.1%' },
];

describe('parseVatRate', () => {
  it.each([
    ['8.1%', 8.1],
    ['8.1', 8.1],
    ['3,8%', 3.8],
    [' 2.6 % ', 2.6],
  ])('parses %s as %s', (input, expected) => {
    expect(parseVatRate(input)).toBe(expected);
  });

  it('treats an unusable rate as zero rather than NaN', () => {
    expect(parseVatRate('')).toBe(0);
    expect(parseVatRate(undefined)).toBe(0);
    expect(parseVatRate('normalsatz')).toBe(0);
  });
});

describe('parseBirthYear', () => {
  it('reads the year out of an ISO birthday', () => {
    expect(parseBirthYear('2009-04-17')).toBe(2009);
  });

  it('reads the year out of a Swiss-formatted birthday', () => {
    expect(parseBirthYear('17.04.2009')).toBe(2009);
  });

  it('returns undefined when there is no birthday on file', () => {
    expect(parseBirthYear('')).toBeUndefined();
    expect(parseBirthYear(null)).toBeUndefined();
    expect(parseBirthYear('unbekannt')).toBeUndefined();
  });
});

describe('resolveReferenceYear', () => {
  it('defaults to the year the bill is raised', () => {
    expect(resolveReferenceYear(undefined, new Date('2026-11-02T00:00:00Z'))).toBe(2026);
  });

  it('uses the configured fixed year when asked to', () => {
    expect(
      resolveReferenceYear(
        { referenceYearMode: 'fixedYear', fixedReferenceYear: 2027 },
        new Date('2026-11-02T00:00:00Z'),
      ),
    ).toBe(2027);
  });
});

describe('isVatExempt', () => {
  const invoicedIn2026 = new Date('2026-11-02T00:00:00Z');
  const invoicedIn2027 = new Date('2027-03-01T00:00:00Z');

  it('keeps a participant exempt for the whole year in which they turn 18', () => {
    // Born 2008, turns 18 during 2026 — still counts as under-age until 31.12.2026.
    expect(isVatExempt('2008-12-31', undefined, invoicedIn2026)).toBe(true);
    expect(isVatExempt('2008-01-01', undefined, invoicedIn2026)).toBe(true);
  });

  it('taxes a participant from the year after they turn 18', () => {
    // Born 2007, turned 18 during 2025.
    expect(isVatExempt('2007-01-01', undefined, invoicedIn2026)).toBe(false);
  });

  it('moves the boundary with the invoice year', () => {
    expect(isVatExempt('2009-06-01', undefined, invoicedIn2027)).toBe(true);
    expect(isVatExempt('2008-06-01', undefined, invoicedIn2027)).toBe(false);
  });

  it('judges everyone against the camp year when pinned to a fixed year', () => {
    const campYear = { referenceYearMode: 'fixedYear' as const, fixedReferenceYear: 2027 };
    // Invoiced in 2026, but measured against the 2027 camp: born 2009 is still exempt.
    expect(isVatExempt('2009-06-01', campYear, invoicedIn2026)).toBe(true);
    expect(isVatExempt('2008-06-01', campYear, invoicedIn2026)).toBe(false);
  });

  it('honours a different age limit', () => {
    expect(isVatExempt('2010-06-01', { maxAge: 16 }, invoicedIn2027)).toBe(false);
    expect(isVatExempt('2011-06-01', { maxAge: 16 }, invoicedIn2027)).toBe(true);
  });

  it('taxes everyone when the exemption is switched off', () => {
    expect(isVatExempt('2015-06-01', { enabled: false }, invoicedIn2027)).toBe(false);
  });

  it('taxes a participant whose birthday never made it out of Cevi.DB', () => {
    expect(isVatExempt(null, undefined, invoicedIn2027)).toBe(false);
  });
});

describe('resolveVatSplits', () => {
  it('falls back to the single VAT code when no split is configured', () => {
    expect(resolveVatSplits([], '8.1%')).toEqual([{ share: 100, vatCode: '8.1%' }]);
    expect(resolveVatSplits(null, '8.1%')).toEqual([{ share: 100, vatCode: '8.1%' }]);
  });

  it('ignores split rows with no usable share', () => {
    expect(resolveVatSplits([{ share: 0, vatCode: '3.8%' }], '8.1%')).toEqual([
      { share: 100, vatCode: '8.1%' },
    ]);
  });
});

describe('calculateVat', () => {
  const invoiceDate = new Date('2026-11-02T00:00:00Z');

  it('taxes the whole amount at a single rate when no split is configured', () => {
    const result = calculateVat({
      netAmount: 330,
      vatCode: '8.1%',
      birthday: '1990-01-01',
      invoiceDate,
    });

    expect(result.isExempt).toBe(false);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]?.vatAmount).toBe(26.73);
    expect(result.vatAmount).toBe(26.73);
    expect(result.totalAmount).toBe(356.73);
  });

  it('splits the net fee 50/50 across 3.8% and 8.1%', () => {
    const result = calculateVat({
      netAmount: 330,
      vatSplits: CAMP_SPLIT,
      birthday: '1990-01-01',
      invoiceDate,
    });

    expect(result.components.map((c) => c.netAmount)).toEqual([165, 165]);
    expect(result.components.map((c) => c.vatAmount)).toEqual([6.27, 13.37]);
    expect(result.vatAmount).toBe(19.64);
    expect(result.totalAmount).toBe(349.64);
  });

  it('keeps the net slices adding up to the net amount when the split does not divide evenly', () => {
    const result = calculateVat({
      netAmount: 333.33,
      vatSplits: [
        { share: 1, vatCode: '3.8%' },
        { share: 1, vatCode: '3.8%' },
        { share: 1, vatCode: '8.1%' },
      ],
      birthday: '1990-01-01',
      invoiceDate,
    });

    const netSum = result.components.reduce((sum, component) => sum + component.netAmount, 0);
    expect(Math.round(netSum * 100) / 100).toBe(333.33);
    expect(result.totalAmount).toBe(Math.round((333.33 + result.vatAmount) * 100) / 100);
  });

  it('normalises shares that were configured as weights rather than percentages', () => {
    const asWeights = calculateVat({
      netAmount: 330,
      vatSplits: [
        { share: 1, vatCode: '3.8%' },
        { share: 1, vatCode: '8.1%' },
      ],
      birthday: '1990-01-01',
      invoiceDate,
    });
    const asPercentages = calculateVat({
      netAmount: 330,
      vatSplits: CAMP_SPLIT,
      birthday: '1990-01-01',
      invoiceDate,
    });

    expect(asWeights.totalAmount).toBe(asPercentages.totalAmount);
  });

  it('zero-rates every slice of an exempt participant', () => {
    const result = calculateVat({
      netAmount: 330,
      vatSplits: CAMP_SPLIT,
      birthday: '2009-06-01',
      exemption: { referenceYearMode: 'fixedYear', fixedReferenceYear: 2027 },
      invoiceDate,
    });

    expect(result.isExempt).toBe(true);
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(330);
    expect(result.components.every((component) => component.vatRate === 0)).toBe(true);
  });

  it('charges an adult the split even when the exemption is enabled', () => {
    const result = calculateVat({
      netAmount: 330,
      vatSplits: CAMP_SPLIT,
      birthday: '2000-06-01',
      exemption: { enabled: true, maxAge: 18, referenceYearMode: 'invoiceYear' },
      invoiceDate,
    });

    expect(result.isExempt).toBe(false);
    expect(result.totalAmount).toBe(349.64);
  });
});

describe('formatVatLineLabel', () => {
  const component = {
    label: 'Beherbergung',
    share: 50,
    netAmount: 165,
    vatRate: 3.8,
    formattedVatCode: '3.8%',
    vatAmount: 6.27,
  };

  it('names the rate and the share it belongs to', () => {
    expect(formatVatLineLabel(component, false)).toBe('MWST 3.8% (Beherbergung)');
  });

  it('omits the label when the split row has none', () => {
    expect(formatVatLineLabel({ ...component, label: '' }, false)).toBe('MWST 3.8%');
  });

  it('explains the zero rate on an exempt bill', () => {
    expect(formatVatLineLabel(component, true)).toBe(
      'MWST 0.0% (steuerbefreite Leistung an Jugendliche)',
    );
  });
});
