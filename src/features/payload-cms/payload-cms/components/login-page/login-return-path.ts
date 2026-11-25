const LOGIN_PATH = '/admin/login';

/**
 * The page a login started on, as a path on this site.
 *
 * Auth.js sends a failed login to its error page with nothing but `?error=`, and keeps the page
 * the login started on in its callback cookie. Without it a second attempt returns to the login
 * page, which Payload forwards to `/admin`, where a participant is not authorised.
 *
 * The candidates come from the address and from a cookie, so only the path is kept: whatever
 * host they name, the result stays on this site.
 *
 * @param candidates - Possible return addresses, the most specific first.
 * @returns The first usable path, or `undefined` when the login started on the login page.
 */
export const resolveLoginReturnPath = (
  candidates: readonly (string | undefined)[],
): string | undefined => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === '') continue;

    let url: URL;
    try {
      url = new URL(candidate, 'http://localhost');
    } catch {
      continue;
    }

    // `//host` is another site to a browser, although it parses as a path here.
    if (url.pathname.startsWith('//')) continue;
    if (url.pathname === LOGIN_PATH) continue;

    return `${url.pathname}${url.search}${url.hash}`;
  }

  return undefined;
};

/**
 * Whether a login returns into the admin panel, which is also where one without a return page
 * ends.
 */
export const returnsToAdminPanel = (returnPath: string | undefined): boolean =>
  returnPath === undefined || returnPath === '/admin' || returnPath.startsWith('/admin/');
