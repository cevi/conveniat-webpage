/**
 * This is a simple in-memory "use cache" handler.
 * It uses a standard JavaScript Map with no size limit.
 * Stale entries are considered expired/missing and will be
 * removed on-access if they are past their 'revalidate' time.
 *
 * Includes simple debug logging.
 */

import { CacheEntry, CacheHandler } from './types.cjs';

// Define a simple logging prefix
const LOG_PREFIX = '[SimpleCacheHandler]';

export function createDefaultCacheHandler(): CacheHandler {
  const memoryCache = new Map<string, CacheEntry>();
  const pendingSets = new Map<string, Promise<void>>();

  return {
    async get(cacheKey) {
      // Wait for any pending set for this key to complete
      const pendingPromise = pendingSets.get(cacheKey);
      if (pendingPromise) {
        console.log(`${LOG_PREFIX} GET: ${cacheKey} (waiting for pending set)`);
        await pendingPromise;
      }

      const entry = memoryCache.get(cacheKey);

      if (!entry) {
        console.log(`${LOG_PREFIX} GET: ${cacheKey} (MISS)`);
        return undefined;
      }

      // Check if the entry is expired based on its revalidate time.
      const now = performance.timeOrigin + performance.now();
      const expirationTime = entry.timestamp + entry.revalidate * 1000;

      if (now > expirationTime) {
        console.log(`${LOG_PREFIX} GET: ${cacheKey} (EXPIRED)`);
        // Entry is expired, remove it from the cache.
        memoryCache.delete(cacheKey);
        return undefined;
      }

      console.log(`${LOG_PREFIX} GET: ${cacheKey} (HIT)`);

      // Clone the stream. One branch is returned, the other
      // is stored back in the cache.
      const [returnStream, newSaved] = entry.value.tee();
      entry.value = newSaved; // Update the entry in-place

      return {
        ...entry,
        value: returnStream,
      };
    },

    async set(cacheKey, pendingEntry) {
      let resolvePending: () => void = () => {};
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
      pendingSets.set(cacheKey, pendingPromise);

      try {
        const entry = await pendingEntry;

        // We must tee the stream. We'll store one branch in the cache.
        // We must *drain* the other branch, or the stored branch
        // may never become readable.
        const [streamToStore, streamToDrain] = entry.value.tee();

        // Update the entry object to hold the stream we are caching
        entry.value = streamToStore;

        // Drain the other stream to pull the data through
        const reader = streamToDrain.getReader();
        while (!(await reader.read()).done) {
          // Discard chunks
        }

        // Now store the entry (which contains streamToStore)
        memoryCache.set(cacheKey, entry);
        console.log(`${LOG_PREFIX} SET: ${cacheKey} (SUCCESS)`);
      } catch (err) {
        // Handle or log the error if setting fails
        console.error(`${LOG_PREFIX} SET: ${cacheKey} (FAILED)`, err);
      } finally {
        // Resolve the pending promise and remove it
        resolvePending();
        pendingSets.delete(cacheKey);
      }
    },

    async updateTags(tags: string[]) {
      console.log(`${LOG_PREFIX} UPDATE_TAGS: ${tags}.`);
      console.log(`${LOG_PREFIX} UPDATE_TAGS: Clearing all ${memoryCache.size} entries.`);
      memoryCache.clear();

      // Must return a Promise<void>
      return Promise.resolve();
    },

    async getExpiration() {
      console.log(`${LOG_PREFIX} GET_EXPIRATION (no-op, returning 0)`);
      return Promise.resolve(0);
    },

    async refreshTags() {
      console.log(`${LOG_PREFIX} REFRESH_TAGS (no-op)`);
      return Promise.resolve();
    },
  };
}

// Default export creates a handler with no size limit
export default createDefaultCacheHandler();
