import { CACHE_NAMES } from '@/features/service-worker/constants';
import { clearPersonalCaches } from '@/features/service-worker/offline-support/personal-caches';
import {
  cachePageAndScrape,
  isOfflineSupportEnabled,
  setOfflineSupportEnabled,
} from '@/features/service-worker/offline-support/prefetch';

const ORIGIN = 'https://conveniat27.ch';

const urlOf = (key: RequestInfo | URL): string => {
  if (typeof key === 'string') return new URL(key, ORIGIN).href;
  if (key instanceof URL) return key.href;
  return key.url;
};

/** An in-memory Cache Storage, keyed by full URL like the real one. */
const inMemoryCaches = (): { storage: CacheStorage; entries: Map<string, Map<string, string>> } => {
  const entries = new Map<string, Map<string, string>>();
  const open = (name: string): Promise<Cache> => {
    const cache = entries.get(name) ?? new Map<string, string>();
    entries.set(name, cache);
    return Promise.resolve({
      match: (key: RequestInfo | URL) => {
        const body = cache.get(urlOf(key));
        return Promise.resolve(body === undefined ? undefined : new Response(body));
      },
      put: async (key: RequestInfo | URL, response: Response) => {
        cache.set(urlOf(key), await response.text());
      },
      delete: (key: RequestInfo | URL) => Promise.resolve(cache.delete(urlOf(key))),
      keys: () => Promise.resolve([...cache.keys()].map((url) => new Request(url))),
    } as unknown as Cache);
  };
  const storage = {
    open,
    delete: (name: string) => Promise.resolve(entries.delete(name)),
  } as unknown as CacheStorage;
  return { storage, entries };
};

const pathsIn = (entries: Map<string, Map<string, string>>, name: string): string[] =>
  [...(entries.get(name)?.keys() ?? [])].map((url) => new URL(url).pathname);

describe('clearing personal caches on logout', () => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const originalNavigator = globalThis.navigator;
  let entries: Map<string, Map<string, string>>;

  beforeEach(async () => {
    const memory = inMemoryCaches();
    globalThis.caches = memory.storage;
    entries = memory.entries;

    const pages = await caches.open(CACHE_NAMES.PAGES);
    for (const path of [
      '/entrypoint?app-mode=true',
      '/~offline',
      '/app/settings',
      '/app/dashboard',
    ]) {
      await pages.put(`${ORIGIN}${path}`, new Response(`page ${path}`));
    }
    const rsc = await caches.open(CACHE_NAMES.RSC);
    await rsc.put(`${ORIGIN}/app/settings?_rsc`, new Response('settings payload'));
    const tiles = await caches.open(CACHE_NAMES.MAP_TILES);
    await tiles.put(`${ORIGIN}/tile.pbf`, new Response('tile'));
    await setOfflineSupportEnabled(true);
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'location');
  });

  it("removes the previous user's pages but keeps what the app needs to start offline", async () => {
    await clearPersonalCaches();

    expect(pathsIn(entries, CACHE_NAMES.PAGES).sort()).toEqual(['/entrypoint', '/~offline']);
    expect(entries.has(CACHE_NAMES.RSC)).toBe(false);
    // nothing personal in these, and the map tiles are expensive to download again
    expect(pathsIn(entries, CACHE_NAMES.MAP_TILES)).toEqual(['/tile.pbf']);
  });

  it('no longer reports the offline download as done', async () => {
    await clearPersonalCaches();

    await expect(isOfflineSupportEnabled()).resolves.toBe(false);
  });

  it('does not store a page the running download fetched with the previous cookie', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    Object.defineProperty(globalThis, 'location', {
      value: new URL(ORIGIN),
      configurable: true,
    });
    let answerPage: ((response: Response) => void) | undefined;
    globalThis.fetch = jest.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((resolve) => {
          if (urlOf(input).includes('_rsc')) {
            resolve(new Response('', { status: 404 }));
            return;
          }
          answerPage = resolve;
        }),
    );

    const download = cachePageAndScrape('/app/profile');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await clearPersonalCaches();
    answerPage?.(new Response('<html>the previous user</html>'));
    await download;

    expect(pathsIn(entries, CACHE_NAMES.PAGES)).not.toContain('/app/profile');
  });
});
