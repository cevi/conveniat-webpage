/**
 * How every request of ours introduces itself to Cevi.DB.
 *
 * One name for all of them — the API, the web interface we read with a browser session,
 * and the OAuth sign-in — so whoever runs Cevi.DB can find our traffic in their logs with
 * a single search and knows whom to ask about it. In the form browsers and crawlers use,
 * because the web interface sits behind a proxy that expects one.
 *
 * Kept in a file of its own so the sign-in code can import it without the rest of the
 * Cevi.DB client.
 */
export const CEVI_DATABASE_USER_AGENT = 'Mozilla/5.0 (compatible; conveniat27-ERP)';

/**
 * The request options with our name on them, whatever name they carried before.
 *
 * Libraries that make a request on our behalf set their own, and that is the one to replace.
 */
export const withCeviDatabaseUserAgent = (init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers);
  headers.set('User-Agent', CEVI_DATABASE_USER_AGENT);
  return { ...init, headers };
};
