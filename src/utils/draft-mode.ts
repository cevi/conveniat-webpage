/**
 * Regex to detect the __prerender_bypass cookie (Next.js draft mode).
 * Matches the cookie name at start, after semicolon, or with any value.
 */
export const DRAFT_MODE_COOKIE_REGEX = /(?:^|;\s*)__prerender_bypass(?:=|;|$)/;

/**
 * Checks if the given cookie string indicates Next.js draft mode is active.
 * @param cookieString - The cookie string to check (e.g., document.cookie or request header)
 * @returns true if draft mode is active
 */
export function isDraftMode(cookieString: string | null | undefined): boolean {
  if (cookieString === null || cookieString === undefined || cookieString === '') return false;
  return DRAFT_MODE_COOKIE_REGEX.test(cookieString);
}

/**
 * Checks if the current page is in Payload CMS preview mode via URL parameter.
 * This is used by Payload's live preview iframe which uses `?preview=true`.
 * @returns true if preview=true is in the current URL
 */
export function isPreviewModeFromUrl(): boolean {
  try {
    const url = new URL(globalThis.location.href);
    return url.searchParams.get('preview') === 'true';
  } catch {
    return false;
  }
}

/**
 * Checks if either draft mode (cookie) or preview mode (URL param) is active.
 * Use this for client-side checks where both indicators should bypass offline handling.
 * @param cookieString - Optional cookie string (defaults to document.cookie in browser)
 * @returns true if draft or preview mode is active
 */
export function isDraftOrPreviewMode(cookieString?: string | null): boolean {
  // Check URL parameter first (no cookie needed)
  if (isPreviewModeFromUrl()) {
    return true;
  }

  // Fallback to cookie check
  const cookies = cookieString ?? getDocumentCookie();
  return isDraftMode(cookies);
}

/**
 * Helper to safely get document.cookie in browser environments.
 */
function getDocumentCookie(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  return document.cookie;
}
