import { isExcludedFromPathRewrites } from '@/proxy/utils/is-excluded-from-path-rewrites';
import type { NextRequest } from 'next/server';

/**
 * Checks whether a request is a `multipart/form-data` POST to a page route that cannot
 * belong to this app.
 *
 * Next.js treats every multipart POST to a page as a possible Server Function call and
 * parses the body before any of our code runs. A malformed body makes that parser throw
 * (`TypeError: Failed to parse body as FormData.`), which surfaces as a 500 and a
 * reported error even though no route was ever reached (#1559).
 *
 * Server Functions invoked from our client components carry a `next-action` header, and
 * no form in this app posts to a page route without JavaScript, so a multipart POST
 * without that header is never ours. Uploads go to `/api/*` and the Payload admin panel
 * and its REST API live under their own paths, all of which are excluded from path
 * rewrites and therefore left alone here.
 *
 * @param request - The incoming request.
 * @returns `true` if the request should be rejected before Next.js reads the body.
 */
export const isUnhandledMultipartPost = (request: NextRequest): boolean => {
  if (request.method !== 'POST') return false;

  const contentType = request.headers.get('content-type');
  if (contentType?.toLowerCase().startsWith('multipart/form-data') !== true) {
    return false;
  }

  if (request.headers.get('next-action') !== null) return false;

  return !isExcludedFromPathRewrites(request);
};
