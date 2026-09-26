/**
 * Decides whether a request for a document file is a visitor opening it, as opposed to a request
 * the browser or the Next.js router makes on its own.
 *
 * - `next/link` points at document URLs, so the router prefetches them and, on click, first asks
 *   for an RSC payload before falling back to a full navigation. Both carry RSC markers.
 * - PDF viewers load a file in several range requests; only the one starting at byte 0 counts.
 * - Editors opening a file from the admin panel are not visitors.
 *
 * @param headers the request headers
 * @param searchParameters the request search parameters
 * @returns `true` if the request should be counted as a download
 */
export const isCountedDocumentDownload = (
  headers: Headers,
  searchParameters: URLSearchParams,
): boolean => {
  if (headers.has('RSC') || headers.has('Next-Router-Prefetch') || searchParameters.has('_rsc')) {
    return false;
  }

  const purpose = headers.get('Sec-Purpose') ?? headers.get('Purpose');
  if (purpose?.includes('prefetch') === true) return false;

  const range = headers.get('Range');
  if (range !== null && !range.trim().startsWith('bytes=0-')) return false;

  const referer = headers.get('Referer');
  if (referer !== null) {
    try {
      if (new URL(referer).pathname.startsWith('/admin')) return false;
    } catch {
      // a malformed referer says nothing about where the visitor came from
    }
  }

  return true;
};
