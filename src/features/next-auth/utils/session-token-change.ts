import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Auth.js re-signs the session cookie and sends it back on every session check, also when the
 * token in it is the one that came in. A response that was under way while another one refreshed
 * the session then puts the previous cookie back, and with it a refresh token Cevi.DB has since
 * replaced. So the `jwt` callback says here whether it kept the token, and whoever passes the
 * Auth.js response on leaves an unchanged session cookie out of it.
 */
const sessionChecks = new AsyncLocalStorage<{ isTokenKept?: boolean }>();

/** Called by the `jwt` callback when it returns the token it was given. */
export const reportSessionTokenKept = (): void => {
  const check = sessionChecks.getStore();
  if (check !== undefined) check.isTokenKept = true;
};

/**
 * Runs a session check and says whether the `jwt` callback kept the token. False when it issued
 * or ended one, and when it did not run at all, e.g. on sign-out: those cookies have to go out.
 */
export const trackSessionToken = async <T>(
  check: () => Promise<T>,
): Promise<{ result: T; isTokenKept: boolean }> => {
  const store: { isTokenKept?: boolean } = {};
  const result = await sessionChecks.run(store, check);
  return { result, isTokenKept: store.isTokenKept === true };
};

/**
 * Whether a `Set-Cookie` header hands out a session token, in one piece or as one of its chunks.
 * A header that clears the cookie has no value and is not one: Auth.js also ends a session after
 * the `jwt` callback kept its token, when the `session` callback cannot read it, and that has to
 * reach the browser.
 */
export const isReissuedSessionToken = (setCookie: string): boolean =>
  /^[^=]*session-token(\.\d+)?=[^;]/.test(setCookie);

type RouteHandler<Arguments extends unknown[]> = (...arguments_: Arguments) => Promise<Response>;

/**
 * Wraps an Auth.js route handler so that its answer only hands out a session token when the
 * session changed. The client asks for its session on every mount and window focus, and each of
 * those answers would otherwise carry a cookie of its own.
 */
export const withoutUnchangedSessionCookie =
  <Arguments extends unknown[]>(handler: RouteHandler<Arguments>): RouteHandler<Arguments> =>
  async (...arguments_) => {
    const { result: response, isTokenKept } = await trackSessionToken(() => handler(...arguments_));
    if (!isTokenKept) return response;

    const headers = new Headers(response.headers);
    headers.delete('set-cookie');
    for (const cookie of response.headers.getSetCookie()) {
      if (!isReissuedSessionToken(cookie)) headers.append('set-cookie', cookie);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
