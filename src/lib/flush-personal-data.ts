'use client';

import { clearUnsentChatData } from '@/lib/chat-local-storage';
import { withKeyvalStore } from '@/lib/idb-keyval-store';
import { clearPersonalPreferences } from '@/lib/preferences';
import { starsCollection } from '@/lib/tanstack-db';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

/**
 * Storage keys used by @tanstack/react-query-persist-client to persist
 * the query cache across page reloads. Contains a mix of personal and
 * non-personal data so we wipe it entirely on logout.
 */
const PERSISTED_QUERY_CACHE_KEY = 'conveniat-query-cache';
const PERSISTED_QUERY_CACHE_IDB_KEY = 'conveniat-query-cache-idb';

/** Legacy localStorage key for starred items (pre-TanStack DB migration). */
const LEGACY_STARS_KEY = 'starredItems';

/**
 * Flush all client-side personal data.
 *
 * Should be called **before** `signOut()` so that storage writes
 * happen synchronously while the page is still alive.
 *
 * What gets cleared:
 * - Persisted TanStack Query cache in localStorage (`conveniat-query-cache`) and IndexedDB (`conveniat-query-cache-idb`)
 * - Cached NextAuth session in Service Worker cache (`next-auth-session-cache`)
 * - With `clearCachedPages`, the service worker's cached pages and RSC payloads, which hold
 *   pages rendered for the user, together with the offline download made with their cookie
 * - TanStack DB `stars` collection (personal starred items)
 * - Personal preferences (onboarding state etc.), see `clearPersonalPreferences`
 * - Legacy `starredItems` localStorage key
 * - Unsent chat messages and drafts, unless `keepUnsentChatMessages` is set
 *
 * What is preserved:
 * - TanStack DB `schedule-entries` collection (public, non-personal)
 * - Preferences declared `keepOnLogout`, which belong to the device, like a push opt-out
 *
 * An expired session (a 401) keeps the unsent chat messages: the user did not choose to
 * leave, and dropping their queue would lose what they wrote. Queued sends carry the id of
 * their sender, so nobody else logging in on the phone sends them.
 *
 * `clearCachedPages` is for an explicit logout or a switch to another account. The other
 * callers, a 401 and skipping the login, also run for someone who was never logged in, and the
 * offline download itself triggers a 401 for them: clearing the pages there wiped the download
 * while it was running.
 */
export function flushPersonalData({
  keepUnsentChatMessages = false,
  clearCachedPages = false,
}: { keepUnsentChatMessages?: boolean; clearCachedPages?: boolean } = {}): void {
  // 1. Remove persisted TanStack Query cache (mixed personal / public data) from localStorage.
  try {
    localStorage.removeItem(PERSISTED_QUERY_CACHE_KEY);
    localStorage.removeItem(PERSISTED_QUERY_CACHE_IDB_KEY);
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }

  // Clear IndexedDB query cache. Not awaited: this runs while the page is on its way to
  // `/entrypoint`, and a store we cannot reach has nothing left to wipe anyway.
  void withKeyvalStore('readwrite', (store) => {
    store.delete(PERSISTED_QUERY_CACHE_IDB_KEY);
  });

  // Clear Service Worker NextAuth session cache
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    void globalThis.caches.delete('next-auth-session-cache').catch(() => {});
  }
  if (
    typeof globalThis !== 'undefined' &&
    'navigator' in globalThis &&
    'serviceWorker' in globalThis.navigator
  ) {
    const { serviceWorker } = globalThis.navigator;
    serviceWorker.controller?.postMessage({ type: 'CLEAR_AUTH_CACHE' });
    if (clearCachedPages) {
      // A page loaded with a hard reload has no controller, but the worker still serves the
      // cached pages on the next load, so fall back to the registration's active worker.
      const message = { type: ServiceWorkerMessages.CLEAR_PERSONAL_CACHES };
      if (serviceWorker.controller) {
        serviceWorker.controller.postMessage(message);
      } else {
        void serviceWorker
          .getRegistration()
          .then((registration) => registration?.active?.postMessage(message))
          .catch(() => {});
      }
    }
  }

  // 2. Clear personal TanStack DB collections.
  try {
    const starsItems = [...starsCollection.state.values()];
    for (const item of starsItems) {
      starsCollection.delete(item.id);
    }
    localStorage.removeItem('tanstack-db-stars');
  } catch {
    // Collection may not be initialised yet — safe to ignore.
  }

  try {
    clearPersonalPreferences();
  } catch {
    // Collection may not be initialised yet — safe to ignore.
  }

  // 3. Remove legacy localStorage key (pre-migration starred items).
  try {
    localStorage.removeItem(LEGACY_STARS_KEY);
  } catch {
    // Ignore — same reason as above.
  }

  // 4. Unsent chat messages and drafts.
  if (!keepUnsentChatMessages) clearUnsentChatData();
}
