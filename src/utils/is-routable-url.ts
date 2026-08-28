/**
 * Any base works for the yes/no answer: a relative target resolves against it,
 * an absolute one ignores it and has to supply its own host. Mirrors what
 * next/link does, which resolves against `window.location.href`.
 */
const URL_RESOLUTION_BASE = 'https://conveniat27.ch';

/**
 * Whether `href` names somewhere to go.
 *
 * Payload skips field validation on drafts, so the `validateURL` on the shared
 * link field never sees a custom URL an editor is still typing. They save
 * mid-"https://", and the render path turns that into a link a visitor can
 * click and get nowhere.
 *
 * next/link degrades gracefully on its side — it resolves every href through
 * `new URL()`, and `coercePrefetchableUrl` catches the failure, reports it and
 * marks the link non-prefetchable rather than breaking the page. The dead link
 * is still rendered, though, and that is the part worth fixing.
 *
 * See https://github.com/cevi/conveniat-webpage/issues/1670
 */
export const isRoutableURL = (href: string): boolean => {
  // An empty href resolves to the base rather than failing, but it is not a
  // destination either.
  if (href.trim() === '') return false;

  try {
    return new URL(href, URL_RESOLUTION_BASE).href !== '';
  } catch {
    return false;
  }
};
