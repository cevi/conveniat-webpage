import { CACHE_NAMES } from '@/features/service-worker/constants';
import { clearPersonalCaches } from '@/features/service-worker/offline-support/personal-caches';
import { isOfflineSupportEnabled } from '@/features/service-worker/offline-support/prefetch';

/** A Cache Storage holding named caches with the given keys. */
const cacheStorageWith = (names: string[]): { storage: CacheStorage; names: Set<string> } => {
  const existing = new Set(names);
  const entries = new Map<string, Map<string, Response>>();
  const open = (name: string): Promise<Cache> => {
    existing.add(name);
    const cache = entries.get(name) ?? new Map<string, Response>();
    entries.set(name, cache);
    return Promise.resolve({
      match: (key: string) => Promise.resolve(cache.get(key)),
      put: (key: string, response: Response) => {
        cache.set(key, response);
        return Promise.resolve();
      },
      delete: (key: string) => Promise.resolve(cache.delete(key)),
    } as unknown as Cache);
  };
  const storage = {
    open,
    delete: (name: string) => {
      entries.delete(name);
      return Promise.resolve(existing.delete(name));
    },
  } as unknown as CacheStorage;
  return { storage, names: existing };
};

describe('clearing personal caches on logout', () => {
  const originalCaches = globalThis.caches;

  afterEach(() => {
    globalThis.caches = originalCaches;
  });

  it('removes the cached pages, RSC payloads and session of the previous user', async () => {
    const { storage, names } = cacheStorageWith([
      CACHE_NAMES.PAGES,
      CACHE_NAMES.RSC,
      CACHE_NAMES.AUTH_SESSION,
      CACHE_NAMES.MAP_TILES,
      CACHE_NAMES.JS,
    ]);
    globalThis.caches = storage;

    await clearPersonalCaches();

    expect(names.has(CACHE_NAMES.PAGES)).toBe(false);
    expect(names.has(CACHE_NAMES.RSC)).toBe(false);
    expect(names.has(CACHE_NAMES.AUTH_SESSION)).toBe(false);
    // nothing personal in these, and the map tiles are expensive to download again
    expect(names.has(CACHE_NAMES.MAP_TILES)).toBe(true);
    expect(names.has(CACHE_NAMES.JS)).toBe(true);
  });

  it('no longer reports the offline download as done', async () => {
    const { storage } = cacheStorageWith([]);
    globalThis.caches = storage;
    const statusCache = await storage.open(CACHE_NAMES.OFFLINE_STATUS);
    await statusCache.put('offline-enabled', new Response('true'));

    await clearPersonalCaches();

    await expect(isOfflineSupportEnabled()).resolves.toBe(false);
  });
});
