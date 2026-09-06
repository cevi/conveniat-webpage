import { reloadPage } from '@/utils/reload-page';

/**
 * @fileoverview Recovery from deployment skew: a browser still running the bundle of one
 * deployment asking for a chunk only that deployment served.
 *
 * Both deployments roll over with `start-first` and two replicas, and a container carries its
 * own `/_next/static` inside the image, so nothing keeps the previous build's chunks reachable
 * once the rollover finishes. A tab, a bfcache entry or a PWA WebView that survives the deploy
 * therefore holds a module graph pointing at files that no longer exist, and every lazy import
 * it makes from then on fails. Turbopack also renumbers module ids between builds, so a stale
 * Service Worker precache or HTML shell can hand the runtime a module id the current bundle
 * does not register.
 *
 * The only way out is a full reload onto the current build. `ChunkErrorHandler` does that for
 * errors that reach `window`, but a React error boundary swallows the error before `window`
 * sees it, which is why the boundaries call in here directly.
 */

/** sessionStorage key holding the timestamp of the last recovery reload. */
const RELOAD_GUARD_KEY = 'chunk_reload_time';

/** A second stale-bundle error this soon after a recovery reload means reloading is not helping. */
const RELOAD_GUARD_WINDOW_MS = 10_000;

const messageOf = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallbackMessage;
};

const readLastReloadAt = (): number | undefined => {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (raw === null) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    // sessionStorage is unavailable in some private-browsing modes. Without it we cannot
    // detect a loop, so treat every error as a first attempt rather than never recovering.
    return undefined;
  }
};

const writeLastReloadAt = (timestamp: number): void => {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(timestamp));
  } catch {
    /* see readLastReloadAt */
  }
};

/**
 * Whether `error` means the browser cannot resolve part of its own bundle, rather than a fault
 * in the code that bundle contains.
 *
 * Matched on message text because the same condition surfaces under a different error name in
 * each loader: Turbopack throws a plain `Error` about a missing module factory, webpack throws
 * a `ChunkLoadError`, the native ESM loader reports a failed dynamic import, Serwist reports
 * `bad-precaching-response`, and a proxy answering a missing `.js` with an HTML error page
 * produces a `SyntaxError` about an unexpected `<`.
 *
 * @param error the thrown value
 * @param fallbackMessage message to match when `error` carries none, e.g. `ErrorEvent.message`
 */
export const isStaleBundleError = (error: unknown, fallbackMessage = ''): boolean => {
  const message = messageOf(error, fallbackMessage);
  return (
    (error as Error | null)?.name === 'ChunkLoadError' ||
    message.includes('ChunkLoadError') ||
    message.includes('Failed to load chunk') ||
    message.includes('Loading chunk') ||
    message.includes('bad-precaching-response') ||
    message.includes('module factory is not available') ||
    message.includes('was instantiated because') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes("Unexpected token '<'")
  );
};

/**
 * A precache written by the previous build keeps answering with the same missing chunk across
 * reloads, so it has to be dropped before reloading can pick up anything new.
 */
const requiresServiceWorkerReset = (message: string): boolean =>
  message.includes('bad-precaching-response') ||
  message.includes('module factory is not available');

/**
 * Reloads onto the current build when `error` is a stale-bundle error, and reports whether it
 * started a reload so callers can skip work the reload would throw away.
 *
 * Declines to reload when the browser is offline, because the chunk is then merely unreachable
 * and Serwist's offline fallbacks own that case, and when a recovery reload already happened
 * within the last ten seconds, because reloading demonstrably did not help and the error page
 * is more useful than a loop.
 *
 * @param error the thrown value
 * @param fallbackMessage message to match when `error` carries none, e.g. `ErrorEvent.message`
 */
export const attemptStaleBundleRecovery = (error: unknown, fallbackMessage = ''): boolean => {
  if (!isStaleBundleError(error, fallbackMessage)) return false;

  if (!navigator.onLine) {
    console.warn('[chunk-recovery] Offline, leaving this to the offline fallbacks:', error);
    return false;
  }

  const now = Date.now();
  const lastReloadAt = readLastReloadAt();
  if (lastReloadAt !== undefined && now - lastReloadAt < RELOAD_GUARD_WINDOW_MS) {
    console.error('[chunk-recovery] Reloading did not resolve the stale bundle, giving up:', error);
    return false;
  }
  writeLastReloadAt(now);

  console.warn('[chunk-recovery] Stale bundle detected, reloading onto the current build:', error);

  if (
    requiresServiceWorkerReset(messageOf(error, fallbackMessage)) &&
    'serviceWorker' in navigator
  ) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch((error_: unknown) => {
        console.warn('[chunk-recovery] Could not unregister the service worker:', error_);
      })
      .finally(() => {
        reloadPage();
      });
    return true;
  }

  reloadPage();
  return true;
};
