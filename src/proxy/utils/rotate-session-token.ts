import { auth } from '@/utils/auth';
import type { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

function propagateCookieToRequest(request: NextRequest, cookieString: string): void {
  const parts = cookieString.split(';')[0]?.split('=');
  if (parts?.length === 2) {
    const name = parts[0];
    const value = parts[1];
    if (name !== undefined && value !== undefined) {
      const trimmedName = name.trim();
      const trimmedValue = value.trim();
      request.cookies.set(trimmedName, trimmedValue);

      // Update the raw Cookie header string so that libraries reading headers directly
      // (like NextAuth or Payload CMS) get the updated rotated token value.
      const cookieHeader = request.headers.get('cookie') ?? '';
      const cookiePairs = cookieHeader
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);
      const updatedPairs = cookiePairs.filter((p) => !p.startsWith(`${trimmedName}=`));
      updatedPairs.push(`${trimmedName}=${trimmedValue}`);
      request.headers.set('cookie', updatedPairs.join('; '));
    }
  }
}

/**
 * Programmatically runs NextAuth middleware to check for session token rotation.
 * If NextAuth rotates the token and sets a new session cookie, this helper
 * propagates the `Set-Cookie` header to the final `response`.
 */
export async function rotateSessionToken(
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
): Promise<void> {
  const authMiddleware = auth as unknown as (
    request_: NextRequest,
    event_: NextFetchEvent,
  ) => Promise<Response | NextResponse | undefined>;

  const authResponse = await authMiddleware(request, event);

  if (authResponse instanceof Response) {
    const headers = authResponse.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        if (cookie !== '') {
          response.headers.append('set-cookie', cookie);
          propagateCookieToRequest(request, cookie);
        }
      }
    } else {
      const fallback = headers.get('set-cookie');
      if (fallback !== null && fallback !== '') {
        response.headers.set('set-cookie', fallback);
        propagateCookieToRequest(request, fallback);
      }
    }
  }
}
