'use client';

import { starsCollection, userPreferencesCollection } from '@/lib/tanstack-db';

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
 * - TanStack DB `stars` collection (personal starred items)
 * - TanStack DB `userPreferences` collection (onboarding state etc.)
 * - Legacy `starredItems` localStorage key
 *
 * What is preserved:
 * - TanStack DB `schedule-entries` collection (public, non-personal)
 */
export function flushPersonalData(): void {
  // 1. Remove persisted TanStack Query cache (mixed personal / public data) from localStorage.
  try {
    localStorage.removeItem(PERSISTED_QUERY_CACHE_KEY);
    localStorage.removeItem(PERSISTED_QUERY_CACHE_IDB_KEY);
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }

  // Clear IndexedDB query cache
  /* eslint-disable @typescript-eslint/explicit-function-return-type, unicorn/prevent-abbreviations, unicorn/prefer-global-this, unicorn/prefer-add-event-listener, unicorn/no-null */
  if (typeof globalThis !== 'undefined' && 'indexedDB' in globalThis) {
    try {
      const openRequest = globalThis.indexedDB.open('conveniat-db', 1);
      openRequest.onupgradeneeded = (): void => {
        if (!openRequest.result.objectStoreNames.contains('keyval')) {
          openRequest.result.createObjectStore('keyval');
        }
      };
      openRequest.onsuccess = (): void => {
        const db = openRequest.result;
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        store.delete(PERSISTED_QUERY_CACHE_IDB_KEY);
      };
    } catch {
      // IndexedDB may be blocked or unavailable
    }
  }
  /* eslint-enable @typescript-eslint/explicit-function-return-type, unicorn/prevent-abbreviations, unicorn/prefer-global-this, unicorn/prefer-add-event-listener, unicorn/no-null */

  // Clear Service Worker NextAuth session cache
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    void globalThis.caches.delete('next-auth-session-cache').catch(() => undefined);
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
    const userPrefsItems = [...userPreferencesCollection.state.values()];
    for (const item of userPrefsItems) {
      userPreferencesCollection.delete(item.key);
    }
    localStorage.removeItem('tanstack-db-user-preferences');
  } catch {
    // Collection may not be initialised yet — safe to ignore.
  }

  // 3. Remove legacy localStorage key (pre-migration starred items).
  try {
    localStorage.removeItem(LEGACY_STARS_KEY);
  } catch {
    // Ignore — same reason as above.
  }
}
