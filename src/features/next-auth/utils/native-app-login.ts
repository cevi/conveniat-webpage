import { environmentVariables } from '@/config/environment-variables';
import { createLogger } from '@/utils/server-logger';

/**
 * Lets the native apps run the Cevi.DB login in the system browser (Android Auth Tab or Custom Tab,
 * iOS ASWebAuthenticationSession) instead of a WebView of their own, as RFC 8252 asks of native apps.
 *
 * The login starts in the app's WebView, which holds the Auth.js PKCE and state cookies. The app
 * opens {@link startNativeAppLogin} in the system browser, which marks that browser for this login
 * attempt and forwards to the Cevi.DB authorize URL. Cevi.DB redirects to the registered https
 * callback. Where the platform claims that callback for the app (Auth Tab, iOS 17.4+), it never
 * reaches us. Elsewhere it arrives here in the system browser, which lacks the WebView's cookies, so
 * {@link handOffCallbackToNativeApp} passes it on through the app's private URL scheme, and the app
 * loads it in its WebView, which completes the login. Cevi.DB keeps its single registered redirect
 * URI, and the code is useless without the WebView's PKCE verifier.
 */

const logger = createLogger('native-app-login');

/** Private URL schemes of the native apps (RFC 8252 7.1), the only places a callback goes to. */
const NATIVE_APP_SCHEMES = new Set(['ch.cevi.conveniat27', 'ch.cevi.konekta']);

const NATIVE_APP_LOGIN_COOKIE = 'native_app_login';
const CALLBACK_PATH = '/api/auth/callback/cevi-db';
/**
 * Long enough to type a password, short enough that a forgotten mark rarely outlives the attempt.
 * The mark only hands on a callback carrying its own `state`, so it cannot capture another login.
 */
const COOKIE_MAX_AGE_SECONDS = 5 * 60;

interface LoginMark {
  scheme: string;
  state: string;
}

const isCeviDatabaseAuthorizeUrl = (url: URL): boolean => {
  const expected = new URL('/oauth/authorize', environmentVariables.HITOBITO_FORWARD_URL);
  return url.origin === expected.origin && url.pathname === expected.pathname;
};

const parseUrl = (value: string): URL | undefined => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

const cookieAttributes = (maxAge: number): string => {
  const secure = environmentVariables.APP_HOST_URL.startsWith('https:') ? '; Secure' : '';
  return `Path=/api/auth; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
};

const readMark = (request: Request): LoginMark | undefined => {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key !== NATIVE_APP_LOGIN_COOKIE) continue;
    const [scheme, state] = decodeURIComponent(value.join('=')).split(' ');
    if (scheme === undefined || state === undefined || state === '') return undefined;
    return NATIVE_APP_SCHEMES.has(scheme) ? { scheme, state } : undefined;
  }
  return undefined;
};

/**
 * Opened by a native app in the system browser with the Cevi.DB authorize URL its WebView was
 * about to load and its URL scheme. Marks the browser for this login attempt and forwards to Cevi.DB.
 *
 * @param request - `GET ?authorize=<Cevi.DB authorize URL>&scheme=<app scheme>`
 * @returns a redirect to Cevi.DB, or 400 unless it is a Cevi.DB authorize URL with a `state` and
 *   the scheme of one of the apps
 */
export const startNativeAppLogin = (request: Request): Response => {
  const parameters = new URL(request.url).searchParams;
  const authorize = parseUrl(parameters.get('authorize') ?? '');
  const scheme = parameters.get('scheme') ?? '';
  const state = authorize?.searchParams.get('state') ?? '';

  if (
    authorize === undefined ||
    !isCeviDatabaseAuthorizeUrl(authorize) ||
    state === '' ||
    !NATIVE_APP_SCHEMES.has(scheme)
  ) {
    logger.warn('Refused a native app login start', { 'auth.app_scheme': scheme });
    return new Response('Bad Request', { status: 400 });
  }

  const mark = encodeURIComponent(`${scheme} ${state}`);
  return new Response(undefined, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `${NATIVE_APP_LOGIN_COOKIE}=${mark}; ${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`,
      'Cache-Control': 'no-store',
    },
  });
};

/**
 * Hands the Cevi.DB callback of an app login to the native app; any other request is left to
 * Auth.js, including a website login in a browser that still carries an older mark.
 *
 * @param request - any request to the Auth.js route
 * @returns a redirect to `<scheme>://auth-callback?url=<callback URL>`, or `undefined`
 */
export const handOffCallbackToNativeApp = (request: Request): Response | undefined => {
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== CALLBACK_PATH) return undefined;

  const mark = readMark(request);
  if (mark === undefined) return undefined;
  if (requestUrl.searchParams.get('state') !== mark.state) return undefined;

  // The app's WebView loads this, so it has to be the public origin the login started on.
  const callbackUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    environmentVariables.APP_HOST_URL,
  );
  logger.info('Handing the Cevi.DB callback to the native app', {
    'auth.app_scheme': mark.scheme,
  });

  return new Response(undefined, {
    status: 302,
    headers: {
      Location: `${mark.scheme}://auth-callback?url=${encodeURIComponent(callbackUrl.toString())}`,
      'Set-Cookie': `${NATIVE_APP_LOGIN_COOKIE}=; ${cookieAttributes(0)}`,
      'Cache-Control': 'no-store',
    },
  });
};
