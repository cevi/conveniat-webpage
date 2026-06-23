import { auth } from '@/utils/auth';
import type { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

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
        }
      }
    } else {
      const fallback = headers.get('set-cookie');
      if (fallback !== null && fallback !== '') {
        response.headers.set('set-cookie', fallback);
      }
    }
  }
}
