/**
 * Reads a navigation target as a browser would: a path when it is on this origin, the full URL
 * when it is on another one, nothing when it is not http(s).
 *
 * Every value is parsed, also one that starts with a slash: a browser reads `/\host` and
 * `//host` as another origin, so the leading slash alone says nothing.
 */
function parseHttpTarget(rawUrl: string): string | undefined {
  try {
    const parsedUrl = new URL(rawUrl, globalThis.location.origin);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return undefined;
    if (parsedUrl.origin !== globalThis.location.origin) return parsedUrl.href;
    // `https://this-host//other-host` is on this origin, but its path alone names another one,
    // and the path is all that is handed on.
    if (parsedUrl.pathname.startsWith('//')) return undefined;
    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch {
    return undefined;
  }
}

/**
 * Turns the URL a push carries into where the page goes: a path when the target is on this
 * origin, the full URL when it is on another one. The short domain con27.ch is another origin
 * that redirects back here through `/go`, and cutting it down to its path sent `/agbs` to a
 * 404. Anything that is not http(s) falls back to the dashboard.
 */
export function resolvePushTarget(rawUrl: string | undefined): string {
  const fallback = '/app/dashboard';
  if (rawUrl === undefined || rawUrl === '') return fallback;
  return parseHttpTarget(rawUrl) ?? fallback;
}

/** Whether a target from {@link resolvePushTarget} is on another origin. */
export const isOtherOriginTarget = (target: string): boolean => !target.startsWith('/');

/**
 * The path a link asks for, when that path is on this origin. A query parameter is written by
 * whoever built the link, so unlike a push it may not send the page to another origin.
 */
export function resolveSameOriginPath(rawUrl: string | null | undefined): string | undefined {
  if (rawUrl === null || rawUrl === undefined || rawUrl.trim() === '') return undefined;
  const target = parseHttpTarget(rawUrl.trim());
  return target === undefined || isOtherOriginTarget(target) ? undefined : target;
}

/** The chat a same-origin target opens, if it opens one. */
export function chatIdOfTarget(target: string): string | undefined {
  const chatId = /\/app\/chat\/([^/?#]+)/.exec(target)?.[1];
  return chatId === '' ? undefined : chatId;
}
