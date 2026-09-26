import { ITEM_CODE_PATTERN } from '@/features/material/utils/item-form';

/** A depot page, with or without a locale prefix; never a `//host` path. */
const DEPOT_PATH = /^\/(?:[a-z]{2}\/)?app\/material\/(inventar|zurueck)\/?$/;

export type ScanResult = { kind: 'item'; code: string } | { kind: 'loan'; number: number };

const readLoanNumber = (value: string): number | undefined => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
};

const readCode = (value: string): ScanResult | undefined => {
  const code = value.trim().toUpperCase();
  return ITEM_CODE_PATTERN.test(code) ? { kind: 'item', code } : undefined;
};

/**
 * What a scanned or typed value points to: an article label links to the inventory with
 * `?item=`, a loan label to the take-back with `?loan=`. Typed, "#12" or "12" is a loan and a
 * code like "JS-WOLL" an article. `undefined` for anything else, above all a link that is not
 * ours: a sticker pointing elsewhere must not send the phone off the app.
 */
export const parseScan = (value: string, origin: string): ScanResult | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  let url: URL | undefined;
  try {
    url = new URL(trimmed);
  } catch {
    // not a link, read as a number or a code below
  }
  if (url !== undefined) {
    if (url.origin !== new URL(origin).origin) return undefined;
    const page = DEPOT_PATH.exec(url.pathname)?.[1];
    if (page === 'inventar') return readCode(url.searchParams.get('item') ?? '');
    if (page === 'zurueck') {
      const number = readLoanNumber(url.searchParams.get('loan') ?? '');
      return number === undefined ? undefined : { kind: 'loan', number };
    }
    return undefined;
  }
  const loan = /^#?(\d+)$/.exec(trimmed);
  if (loan) {
    const number = readLoanNumber(loan[1] ?? '');
    return number === undefined ? undefined : { kind: 'loan', number };
  }
  return readCode(trimmed);
};

/** The label link of an article, the page its QR code opens. */
export const itemPath = (code: string): string =>
  `/app/material/inventar?item=${encodeURIComponent(code)}`;

/** The label link of a loan: the take-back of whoever has it. */
export const loanPath = (number: number): string => `/app/material/zurueck?loan=${number}`;

/** The depot page a scanned value opens, `undefined` when it is not one of ours. */
export const resolveScan = (value: string, origin: string): string | undefined => {
  const result = parseScan(value, origin);
  if (result === undefined) return undefined;
  return result.kind === 'item' ? itemPath(result.code) : loanPath(result.number);
};
