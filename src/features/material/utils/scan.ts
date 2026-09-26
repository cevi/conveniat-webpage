/** A depot page, with or without a locale prefix; never a `//host` path. */
const DEPOT_PATH = /^\/(?:[a-z]{2}\/)?app\/material(?:\/|$)/;

/**
 * Where a scanned value leads: a label link opens its page, "#12" or "12" a loan, and
 * anything else is read as an article code. `undefined` for a link that is not ours: a
 * sticker pointing elsewhere must not send the phone off the app.
 */
export const resolveScan = (value: string, origin: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  try {
    const url = new URL(trimmed);
    if (url.origin !== new URL(origin).origin || !DEPOT_PATH.test(url.pathname)) return undefined;
    return `${url.pathname}${url.search}`;
  } catch {
    // not a link, fall through to the codes
  }
  const loan = /^#?(\d+)$/.exec(trimmed);
  if (loan) return `/app/material/loans?loan=${loan[1]}`;
  return `/app/material/catalog?item=${encodeURIComponent(trimmed.toUpperCase())}`;
};
