import { getItemFormProblems } from '@/features/material/utils/item-form';
import { parseNumberDraft } from '@/features/material/utils/number-input';
import {
  getMaterialErrorKind,
  shouldRetryMaterialQuery,
} from '@/features/material/utils/query-errors';
import {
  completeReturn,
  isReturnValid,
  withCondition,
  withReturned,
} from '@/features/material/utils/returns';
import { parseScan, resolveScan } from '@/features/material/utils/scan';

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

  it('takes back a loan by number', () => {
    expect(resolveScan('#12', origin)).toBe('/app/material/zurueck?loan=12');
    expect(resolveScan(' 7 ', origin)).toBe('/app/material/zurueck?loan=7');
  });

  it('opens anything shaped like a code as an article', () => {
    expect(resolveScan('js-woll', origin)).toBe('/app/material/inventar?item=JS-WOLL');
    expect(resolveScan('not a code', origin)).toBeUndefined();
  });

  it('follows our own label links, also with a locale prefix', () => {
    expect(resolveScan('https://conveniat27.ch/app/material/inventar?item=ZELT', origin)).toBe(
      '/app/material/inventar?item=ZELT',
    );
    expect(resolveScan('https://conveniat27.ch/fr/app/material/zurueck?loan=3', origin)).toBe(
      '/app/material/zurueck?loan=3',
    );
  });

  it('refuses links that would leave the app or are no label', () => {
    expect(
      resolveScan('https://example.com/app/material/inventar?item=A1', origin),
    ).toBeUndefined();
    expect(resolveScan('https://x//evil.com/app/material/x', origin)).toBeUndefined();
    expect(
      resolveScan('https://conveniat27.ch//evil.com/app/material/inventar?item=A1', origin),
    ).toBeUndefined();
    expect(resolveScan('https://conveniat27.ch/app/chat', origin)).toBeUndefined();
    expect(resolveScan('https://conveniat27.ch/app/material/ausgeben', origin)).toBeUndefined();
    expect(
      resolveScan('https://conveniat27.ch/app/material/zurueck?loan=x', origin),
    ).toBeUndefined();
    expect(resolveScan('', origin)).toBeUndefined();
  });
});

describe('parseScan', () => {
  const origin = 'https://conveniat27.ch';

  it('tells an article label from a loan label, for the basket and the take-back', () => {
    expect(parseScan('https://conveniat27.ch/app/material/inventar?item=js-beil', origin)).toEqual({
      kind: 'item',
      code: 'JS-BEIL',
    });
    expect(parseScan('#0', origin)).toBeUndefined();
    expect(parseScan('42', origin)).toEqual({ kind: 'loan', number: 42 });
  });
});

describe('return lines', () => {
  it('starts with everything back and in order', () => {
    expect(completeReturn(5)).toEqual({ issued: 5, returned: 5, condition: 'OK', damaged: 1 });
  });

  it('reads fewer pieces back as missing, and all of them back as fine again', () => {
    const short = withReturned(completeReturn(5), 3);
    expect(short).toMatchObject({ returned: 3, condition: 'MISSING' });
    expect(withReturned(short, 5)).toMatchObject({ returned: 5, condition: 'OK' });
  });

  it('keeps a damage when some pieces are also missing', () => {
    const damaged = withCondition(completeReturn(5), 'DAMAGED');
    expect(withReturned(damaged, 4)).toMatchObject({ condition: 'DAMAGED', returned: 4 });
  });

  it('takes one piece off for "missing" and puts everything back for "OK"', () => {
    const missing = withCondition(completeReturn(5), 'MISSING');
    expect(missing.returned).toBe(4);
    expect(isReturnValid(missing)).toBe(true);
    expect(withCondition(missing, 'OK').returned).toBe(5);
  });

  it('never damages more pieces than came back, nor none', () => {
    const damaged = withCondition(
      { ...completeReturn(5), returned: 0, condition: 'MISSING' },
      'DAMAGED',
    );
    expect(damaged.returned).toBe(5);
    const fewer = withReturned({ ...damaged, damaged: 5 }, 2);
    expect(fewer.damaged).toBe(2);
    expect(isReturnValid(fewer)).toBe(true);
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
