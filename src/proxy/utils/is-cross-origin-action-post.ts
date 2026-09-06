import type { NextRequest } from 'next/server';

/**
 * Reads the host Next.js compares the `origin` header against.
 *
 * Mirrors `parseHostHeader` in `next/dist/server/app-render/action-handler.js`: the first
 * `x-forwarded-host` value wins, the `host` header is the fallback. In production traefik
 * sets `x-forwarded-host` to the requested domain while nginx rewrites `host` to the
 * upstream service name, so only the forwarded value identifies the deployment.
 *
 * @param request - The incoming request.
 * @returns The host, or `undefined` if neither header carries one.
 */
const readHost = (request: NextRequest): string | undefined => {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedHost !== undefined && forwardedHost !== '') return forwardedHost;

  const host = request.headers.get('host');
  return host === null || host === '' ? undefined : host;
};

/**
 * Checks whether a request is a Server Function call whose `origin` header does not belong
 * to this deployment.
 *
 * Next.js refuses such a request as a CSRF attempt and answers it with a 500 whose
 * `Invalid Server Actions request.` error is reported as an application error, even though
 * no action ever ran (#1703). The reported requests were POSTs to `/go/...` carrying a
 * `next-action` header and `origin: https://con27.ch`, the short-link domain traefik
 * redirects to `conveniat27.ch/go/...` — a client that keeps its method and headers across
 * that redirect arrives with an origin that can never match the host.
 *
 * The condition mirrors the CSRF check in
 * `next/dist/server/app-render/action-handler.js`, so every request rejected here would
 * have been refused by Next.js anyway. That equivalence relies on `next.config.ts` setting
 * no `serverActions.allowedOrigins`; adding one means this check has to honour it too.
 *
 * A missing `origin` header is left alone: Next.js allows those with a warning, because a
 * handcrafted request cannot carry credentials the sender did not share willingly.
 *
 * @param request - The incoming request.
 * @returns `true` if the request should be refused before Next.js handles the action.
 */
export const isCrossOriginActionPost = (request: NextRequest): boolean => {
  if (request.method !== 'POST') return false;
  if (request.headers.get('next-action') === null) return false;

  const origin = request.headers.get('origin');
  if (origin === null) return false;

  const host = readHost(request);
  if (host === undefined) return false;

  // An opaque origin, sent after a cross-origin redirect, matches no host.
  if (origin === 'null') return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // Next.js parses the header the same way and throws on a malformed one.
    return true;
  }

  return originHost !== host;
};
