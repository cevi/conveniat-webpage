import type { Session } from 'next-auth';
import type { NextRequest } from 'next/server';

const sessions = new WeakMap<NextRequest, Session | null>();

/** Keeps the session the proxy read for a request, for the proxies after the session check. */
export const rememberRequestSession = (request: NextRequest, session: Session | null): void => {
  sessions.set(request, session);
};

/**
 * The session the proxy read for the request, `null` without one, and `undefined` when it did not
 * check, as for a static asset.
 */
export const requestSession = (request: NextRequest): Session | null | undefined =>
  sessions.get(request);
