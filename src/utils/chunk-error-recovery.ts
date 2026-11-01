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

/** How long the reload waits for the worker's update check before going ahead without it. */
const SERVICE_WORKER_UPDATE_TIMEOUT_MS = 3000;

/**
 * The worker of the previous build keeps answering from the precache it was installed with, so
 * these errors come back on every reload until the current worker has replaced it.
 */
const requiresServiceWorkerUpdate = (message: string): boolean =>
  message.includes('bad-precaching-response') ||
  message.includes('module factory is not available');

/**
 * Asks the browser to fetch the current worker, which takes over and replaces the precache as
 * soon as it is installed.
 *
 * The registration is never unregistered: the Push API deactivates its push subscription with
 * it, and the phone then stops receiving pushes without anyone noticing.
 */
const updateServiceWorker = async (): Promise<void> => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update()));
};

/**
 * Whether this page runs a chunk that the build of the active service worker does not ship.
 *
 * Turbopack keeps a module's id from one build to the next but renames its exports. A chunk of
 * an older build that ends up in a current page therefore finds the current module under its
 * id and fails on the renamed export, with nothing but a `TypeError` to show for it: after
 * 1.45.0 the settings page threw `undefined is not an object (evaluating
 * 'o.f.OFFLINE_DOWNLOAD_PROGRESS')`, and "Try again" ran the same chunk again until the app was
 * closed. That message reads like any bug, so the chunks are compared instead: the worker
 * precaches every chunk of its build, and Turbopack loads each chunk with a `<script>`.
 *
 * Without a controlling worker there is nothing to compare against, and the answer is false.
 */
export const runsChunkOfAnotherBuild = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;
  try {
    const cacheNames = await caches.keys();
    const precacheName = cacheNames.find((name) => name.includes('precache'));
    if (precacheName === undefined) return false;
    const precache = await caches.open(precacheName);
    const precached = await precache.keys();
    const shipped = new Set(precached.map((request) => new URL(request.url).pathname));
    return [...document.scripts].some((script) => {
      if (script.src === '') return false;
      const { pathname } = new URL(script.src);
      return pathname.startsWith('/_next/static/chunks/') && !shipped.has(pathname);
    });
  } catch {
    // the Cache API can refuse access (private mode); then this is not known to be a mixed build
    return false;
  }
};

/**
 * The reload shared by both recoveries, with their conditions: online, and no recovery reload in
 * the last ten seconds.
 */
const reloadOntoCurrentBuild = (error: unknown, updateWorkerFirst: boolean): boolean => {
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

  if (updateWorkerFirst && 'serviceWorker' in navigator) {
    // On a network too slow to answer the update check, the reload is still worth trying.
    const timeout = new Promise<void>((resolve) => {
      setTimeout(resolve, SERVICE_WORKER_UPDATE_TIMEOUT_MS);
    });
    void Promise.race([updateServiceWorker(), timeout])
      .catch((error_: unknown) => {
        console.warn('[chunk-recovery] Could not update the service worker:', error_);
      })
      .finally(() => {
        reloadPage();
      });
    return true;
  }

  reloadPage();
  return true;
};

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
  return reloadOntoCurrentBuild(
    error,
    requiresServiceWorkerUpdate(messageOf(error, fallbackMessage)),
  );
};

/**
 * Reloads onto the current build when the page that threw `error` runs a chunk of another
 * build (see {@link runsChunkOfAnotherBuild}), under the same conditions as
 * {@link attemptStaleBundleRecovery}. For the errors an error boundary catches that the message
 * alone does not mark as stale.
 *
 * @param error the thrown value
 */
export const attemptMixedBuildRecovery = async (error: unknown): Promise<boolean> => {
  if (!(await runsChunkOfAnotherBuild())) return false;
  // the worker is the build the chunks were compared against, so it needs no update
  return reloadOntoCurrentBuild(error, false);
};
