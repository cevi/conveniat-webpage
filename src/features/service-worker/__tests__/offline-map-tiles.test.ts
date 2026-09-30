import { CACHE_NAMES } from '@/features/service-worker/constants';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

// The real module pulls in serwist's ESM build; this keeps its load-balancer normalisation.
jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: (url: string): string => url.replace(/vectortiles[0-9]/, 'vectortiles0'),
}));

const CACHED_TILE =
  'https://vectortiles0.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/14/8569/5795.pbf';

/** A cache that holds exactly the given URLs. */
const cacheOf = (entries: Record<string, string>): Cache =>
  ({
    match: (url: string): Promise<Response | undefined> => {
      const body = entries[url];
      return Promise.resolve(body === undefined ? undefined : new Response(body));
    },
    keys: (): Promise<readonly Request[]> => Promise.resolve([]),
    put: () => Promise.resolve(),
  }) as unknown as Cache;

/** Requests a tile the way MapLibre does: a plain fetch from its web worker. */
const fetchTileFromMapWorker = (url: string): Promise<Response> => {
  let answer: Promise<Response> | undefined;
  const event = {
    request: new Request(url, { mode: 'cors' }),
    clientId: 'maplibre-worker',
    resultingClientId: '',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the tile request');
  return answer;
};

describe('offline map tiles', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'self', {
      value: { location: { origin: 'https://conveniat27.ch' } },
      configurable: true,
    });
    const tiles = cacheOf({ [CACHED_TILE]: 'the tile' });
    const empty = cacheOf({});
    globalThis.caches = {
      open: (name: string) => Promise.resolve(name === CACHE_NAMES.MAP_TILES ? tiles : empty),
      match: () => Promise.resolve(),
    } as unknown as CacheStorage;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'self');
  });

  it('serves a downloaded tile to the map worker, from whichever tile server it asks', async () => {
    const response = await fetchTileFromMapWorker(
      CACHED_TILE.replace('vectortiles0', 'vectortiles4'),
    );

    await expect(response.text()).resolves.toBe('the tile');
  });

  it('fails a tile that was never downloaded', async () => {
    const response = await fetchTileFromMapWorker(
      'https://vectortiles3.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/16/1/1.pbf',
    );

    expect(response.type).toBe('error');
  });
});
