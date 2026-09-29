import { addAppModeClient } from '@/features/service-worker/app-mode';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

// The map module reads the worker's `self.location` on load; no request below is a map tile.
jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';
const APP_CLIENT = 'installed-app-window';

const cacheKey = (request: RequestInfo | URL): string =>
  request instanceof Request ? request.url : new URL(request, ORIGIN).href;

/** CacheStorage keeps entries in insertion order, which the pathname fallback depends on. */
class MemoryCache {
  private readonly entries = new Map<string, Response>();

  match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = cacheKey(request);
    return Promise.resolve(this.entries.get(key)?.clone());
  }

  put(request: RequestInfo | URL, response: Response): Promise<void> {
    const key = cacheKey(request);
    this.entries.set(key, response.clone());
    return Promise.resolve();
  }

  keys(): Promise<Request[]> {
    return Promise.resolve([...this.entries.keys()].map((url) => new Request(url)));
  }
}

const cacheStorage = new Map<string, MemoryCache>();

const fetchRsc = async (path: string, headers: Record<string, string>): Promise<Response> => {
  const event = {
    request: new Request(`${ORIGIN}${path}`, { headers: { RSC: '1', ...headers } }),
    clientId: APP_CLIENT,
    resultingClientId: '',
    respondWith: jest.fn(),
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  const [answer] = event.respondWith.mock.calls[0] as [Promise<Response>];
  const response = await answer;
  // The worker writes the cache without holding up the response.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return response;
};

const setOnline = (onLine: boolean): void => {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: onLine, configurable: true });
};

describe('offline RSC answers for navigations', () => {
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    Object.assign(globalThis, {
      self: { location: { origin: ORIGIN } },
      caches: {
        open: (name: string): Promise<MemoryCache> => {
          const cache = cacheStorage.get(name) ?? new MemoryCache();
          cacheStorage.set(name, cache);
          return Promise.resolve(cache);
        },
      },
    });
    addAppModeClient(APP_CLIENT);
  });

  beforeEach(() => {
    cacheStorage.clear();
    globalThis.fetch = jest.fn((input: RequestInfo | URL) => {
      const { headers } = new Request(input);
      const kind = headers.has('Next-Router-Prefetch') ? 'route tree' : 'navigation';
      return Promise.resolve(
        new Response(`${kind} payload`, { headers: { 'Content-Type': 'text/x-component' } }),
      );
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    setOnline(true);
  });

  test('answers an offline navigation with a navigation payload, never a prefetched route tree', async () => {
    setOnline(true);
    // The dashboard prefetches the chat link, then the user opens the chats from the map.
    await fetchRsc('/app/chat?_rsc=tree', {
      'Next-Router-Prefetch': '1',
      'Next-Router-Segment-Prefetch': '/_tree',
    });
    await fetchRsc('/app/chat?_rsc=from-map', { 'Next-Router-State-Tree': 'map' });

    setOnline(false);
    // Offline, from the dashboard: another router state, so another `_rsc` hash.
    const response = await fetchRsc('/app/chat?_rsc=from-dashboard', {
      'Next-Router-State-Tree': 'dashboard',
    });

    expect(await response.text()).toBe('navigation payload');
  });
});
