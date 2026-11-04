import {
  isReissuedSessionToken,
  trackSessionToken,
} from '@/features/next-auth/utils/session-token-change';
import { auth } from '@/utils/auth';
import type { Session } from 'next-auth';
import type { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

/**
 * Puts a cookie the session check set into the request, so the route reads the same session the
 * browser will. `request.cookies` rewrites the `cookie` header itself and encodes the value, so it
 * takes the decoded one: the `Set-Cookie` value is already encoded, and passing it on as it is
 * encodes it twice, which turns the callback URL into one Auth.js refuses.
 */
function propagateCookieToRequest(request: NextRequest, cookieString: string): void {
  const pair = cookieString.split(';')[0] ?? '';
  const separator = pair.indexOf('=');
  if (separator <= 0) return;
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  if (value === '') {
    request.cookies.delete(name);
    return;
  }
  try {
    request.cookies.set(name, decodeURIComponent(value));
  } catch {
    request.cookies.set(name, value);
  }
}

/**
 * Programmatically runs NextAuth middleware to check for session token rotation.
 * If NextAuth rotates the token and sets a new session cookie, this helper
 * propagates the `Set-Cookie` header to the final `response`. A session whose token stayed the
 * same is not handed that token again.
 *
 * @returns the session the check read, `null` without one
 */
export async function rotateSessionToken(
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
): Promise<Session | null> {
  // The wrapper form runs the same check as `auth(request, event)` and hands the session it read
  // to the callback, so nothing later in the proxy has to run the check a second time.
  let session: Session | null = null;
  const authMiddleware = (
    auth as unknown as (
      callback: (request_: NextRequest & { auth: Session | null }) => void,
    ) => (request_: NextRequest, event_: NextFetchEvent) => Promise<Response | undefined>
  )((request_) => {
    session = request_.auth;
  });

  const { result: authResponse, isTokenKept } = await trackSessionToken(() =>
    authMiddleware(request, event),
  );

  // A token that was kept is not sent back: it would let this response overwrite the cookie of
  // one that rotated it in the meantime. Every other cookie goes out as Auth.js set it.
  const isPassedOn = (cookie: string): boolean =>
    cookie !== '' && !(isTokenKept && isReissuedSessionToken(cookie));

  if (authResponse instanceof Response) {
    const headers = authResponse.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        if (isPassedOn(cookie)) {
          response.headers.append('set-cookie', cookie);
          propagateCookieToRequest(request, cookie);
        }
      }
    } else {
      const fallback = headers.get('set-cookie');
      if (fallback !== null && isPassedOn(fallback)) {
        response.headers.set('set-cookie', fallback);
        propagateCookieToRequest(request, fallback);
      }
    }
  }
  return session;
}
