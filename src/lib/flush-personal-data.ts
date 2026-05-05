'use client';

import { starsCollection, userPreferencesCollection } from '@/lib/tanstack-db';

/**
 * localStorage key used by @tanstack/react-query-persist-client to persist
 * the query cache across page reloads. Contains a mix of personal and
 * non-personal data so we wipe it entirely on logout.
 */
const PERSISTED_QUERY_CACHE_KEY = 'conveniat-query-cache';

/** Legacy localStorage key for starred items (pre-TanStack DB migration). */
const LEGACY_STARS_KEY = 'starredItems';

/**
 * Flush all client-side personal data.
 *
 * Should be called **before** `signOut()` so that localStorage writes
 * happen synchronously while the page is still alive.
 *
 * What gets cleared:
 * - Persisted TanStack Query cache (`conveniat-query-cache`)
 * - TanStack DB `stars` collection (personal starred items)
 * - TanStack DB `userPreferences` collection (onboarding state etc.)
 * - Legacy `starredItems` localStorage key
 *
 * What is preserved:
 * - TanStack DB `schedule-entries` collection (public, non-personal)
 */
export function flushPersonalData(): void {
  // 1. Remove persisted TanStack Query cache (mixed personal / public data).
  //    Public queries (schedule list, map annotations) will be re-fetched on
  //    next login — the cost is negligible.
  try {
    localStorage.removeItem(PERSISTED_QUERY_CACHE_KEY);
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }

  // 2. Clear personal TanStack DB collections.
  //    We iterate and delete rather than dropping the collection so that
  //    reactive subscribers (useLiveQuery) update cleanly.
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
