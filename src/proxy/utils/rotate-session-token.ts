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
    const setCookie = authResponse.headers.get('set-cookie');
    if (setCookie !== null && setCookie !== '') {
      response.headers.set('set-cookie', setCookie);
    }
  }
}
