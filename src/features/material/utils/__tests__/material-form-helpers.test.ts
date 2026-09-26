import { getItemFormProblems } from '@/features/material/utils/item-form';
import { parseNumberDraft } from '@/features/material/utils/number-input';
import {
  getMaterialErrorKind,
  shouldRetryMaterialQuery,
} from '@/features/material/utils/query-errors';
import {
  compareReturnQueue,
  isInReturnQueue,
  isReturnValid,
} from '@/features/material/utils/returns';
import { resolveScan } from '@/features/material/utils/scan';
import type { MaterialLoanStatus } from '@/lib/prisma/client';

describe('parseNumberDraft', () => {
  it('lets the field be empty while typing', () => {
    expect(parseNumberDraft('', 1, 10)).toBeUndefined();
    expect(parseNumberDraft('  ', 1, 10)).toBeUndefined();
    expect(parseNumberDraft('abc', 1, 10)).toBeUndefined();
  });

  it('clamps into the range and drops fractions', () => {
    expect(parseNumberDraft('0', 1, 10)).toBe(1);
    expect(parseNumberDraft('15', 1, 10)).toBe(10);
    expect(parseNumberDraft('3.7', 1, 10)).toBe(3);
  });

  it('never goes below min when max is smaller than min', () => {
    expect(parseNumberDraft('5', 1, 0)).toBe(1);
  });
});

describe('resolveScan', () => {
  const origin = 'https://conveniat27.ch';

  it('opens a loan by number', () => {
    expect(resolveScan('#12', origin)).toBe('/app/material/loans?loan=12');
    expect(resolveScan(' 7 ', origin)).toBe('/app/material/loans?loan=7');
  });

  it('reads anything else as an article code', () => {
    expect(resolveScan('js-woll', origin)).toBe('/app/material/catalog?item=JS-WOLL');
  });

  it('follows our own label links, also with a locale prefix', () => {
    expect(resolveScan('https://conveniat27.ch/app/material/catalog?item=ZELT', origin)).toBe(
      '/app/material/catalog?item=ZELT',
    );
    expect(resolveScan('https://conveniat27.ch/fr/app/material/loans?loan=3', origin)).toBe(
      '/fr/app/material/loans?loan=3',
    );
  });

  it('refuses links that would leave the app', () => {
    expect(resolveScan('https://example.com/app/material/catalog', origin)).toBeUndefined();
    expect(resolveScan('https://x//evil.com/app/material/x', origin)).toBeUndefined();
    expect(resolveScan('https://conveniat27.ch//evil.com/app/material/x', origin)).toBeUndefined();
    expect(resolveScan('https://conveniat27.ch/app/chat', origin)).toBeUndefined();
    expect(resolveScan('', origin)).toBeUndefined();
  });
});

describe('return queue', () => {
  const now = new Date('2027-07-20T12:00:00Z');
  const hours = (n: number): Date => new Date(now.getTime() + n * 60 * 60 * 1000);
  const loan = (
    id: string,
    endDate: Date,
    // eslint-disable-next-line unicorn/no-null -- the column is nullable, as the server sends it
    returnAnnouncedAt: Date | null = null,
    status: MaterialLoanStatus = 'ISSUED',
  ): { id: string; status: MaterialLoanStatus; endDate: Date; returnAnnouncedAt: Date | null } => ({
    id,
    status,
    endDate,
    returnAnnouncedAt,
  });

  it('lists only issued loans that are announced, due within a day, or overdue', () => {
    expect(isInReturnQueue(loan('later', hours(72)), now)).toBe(false);
    expect(isInReturnQueue(loan('announced', hours(72), hours(-1)), now)).toBe(true);
    expect(isInReturnQueue(loan('due', hours(5)), now)).toBe(true);
    expect(isInReturnQueue(loan('overdue', hours(-5)), now)).toBe(true);
    // eslint-disable-next-line unicorn/no-null -- the column is nullable, as the server sends it
    expect(isInReturnQueue(loan('reserved', hours(5), null, 'RESERVED'), now)).toBe(false);
  });

  it('tolerates a cached loan without the announcement field', () => {
    expect(isInReturnQueue({ status: 'ISSUED', endDate: hours(72) }, now)).toBe(false);
  });

  it('puts announced first, then overdue, then due', () => {
    const sorted = [
      loan('due', hours(5)),
      loan('overdue-late', hours(-2)),
      loan('announced', hours(48), hours(-1)),
      loan('overdue-early', hours(-30)),
    ].toSorted(compareReturnQueue(now));
    expect(sorted.map((entry) => entry.id)).toEqual([
      'announced',
      'overdue-early',
      'overdue-late',
      'due',
    ]);
  });
});

describe('isReturnValid', () => {
  it('needs pieces that did not come back to call something missing', () => {
    expect(isReturnValid({ issued: 5, returned: 5, condition: 'MISSING', damaged: 0 })).toBe(false);
    expect(isReturnValid({ issued: 5, returned: 0, condition: 'MISSING', damaged: 0 })).toBe(true);
  });

  it('needs returned pieces for a damage, and a sane damaged count', () => {
    expect(isReturnValid({ issued: 5, returned: 0, condition: 'LIGHT_DAMAGE', damaged: 0 })).toBe(
      false,
    );
    expect(isReturnValid({ issued: 5, returned: 0, condition: 'DAMAGED', damaged: 1 })).toBe(false);
    expect(isReturnValid({ issued: 5, returned: 3, condition: 'DAMAGED', damaged: 4 })).toBe(false);
    expect(isReturnValid({ issued: 5, returned: 3, condition: 'DAMAGED', damaged: 2 })).toBe(true);
  });

  it('accepts a complete return in good order', () => {
    expect(isReturnValid({ issued: 5, returned: 5, condition: 'OK', damaged: 0 })).toBe(true);
  });
});

describe('query errors', () => {
  it('does not retry answers that will not change', () => {
    expect(shouldRetryMaterialQuery(0, { data: { httpStatus: 403 } })).toBe(false);
    expect(shouldRetryMaterialQuery(0, { data: { httpStatus: 401 } })).toBe(false);
  });

  it('retries server and network failures a few times', () => {
    expect(shouldRetryMaterialQuery(0, { data: { httpStatus: 502 } })).toBe(true);
    expect(shouldRetryMaterialQuery(1, {})).toBe(true);
    expect(shouldRetryMaterialQuery(3, {})).toBe(false);
  });

  it('maps codes to the message kind', () => {
    expect(getMaterialErrorKind({ data: { code: 'UNAUTHORIZED' } })).toBe('signedOut');
    expect(getMaterialErrorKind({ data: { code: 'FORBIDDEN' } })).toBe('forbidden');
    expect(getMaterialErrorKind({ data: { code: 'NOT_FOUND' } })).toBe('notFound');
    expect(getMaterialErrorKind({})).toBe('other');
  });
});

describe('getItemFormProblems', () => {
  const valid = { code: 'JS-WOLL', imageUrl: '', maxLoanQuantity: 1 };

  it('accepts a valid article', () => {
    expect(getItemFormProblems(valid).size).toBe(0);
    expect(getItemFormProblems({ ...valid, code: 'js-woll' }).size).toBe(0);
  });

  it('flags each field the server would reject', () => {
    expect(getItemFormProblems({ ...valid, code: 'A' })).toEqual(new Set(['code']));
    expect(getItemFormProblems({ ...valid, code: 'WITH SPACE' })).toEqual(new Set(['code']));
    expect(getItemFormProblems({ ...valid, imageUrl: 'not a link' })).toEqual(
      new Set(['imageUrl']),
    );
    expect(getItemFormProblems({ ...valid, maxLoanQuantity: 0 })).toEqual(
      new Set(['maxLoanQuantity']),
    );
  });
});
