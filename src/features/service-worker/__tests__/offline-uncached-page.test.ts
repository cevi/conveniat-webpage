import { CACHE_NAMES } from '@/features/service-worker/constants';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

const pathOf = (key: RequestInfo | URL): string => {
  if (typeof key === 'string') return new URL(key, ORIGIN).pathname;
  if (key instanceof URL) return key.pathname;
  return new URL(key.url).pathname;
};

/** A cache that matches on the path only, like the worker's `ignoreSearch` lookups. */
const cacheOf = (pages: Record<string, string>): Cache => {
  return {
    match: (key: RequestInfo | URL): Promise<Response | undefined> => {
      const body = pages[pathOf(key)];
      return Promise.resolve(body === undefined ? undefined : new Response(body));
    },
    keys: (): Promise<readonly Request[]> =>
      Promise.resolve(Object.keys(pages).map((path) => new Request(`${ORIGIN}${path}`))),
    put: () => Promise.resolve(),
  } as unknown as Cache;
};

/** Opens a page from the address bar or the home screen, the way the browser asks for it. */
const openPageOffline = (path: string): Promise<Response> => {
  let answer: Promise<Response> | undefined;
  const event = {
    request: {
      url: `${ORIGIN}${path}`,
      method: 'GET',
      mode: 'navigate',
      destination: 'document',
      headers: new Headers(),
    },
    clientId: '',
    resultingClientId: 'client-1',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the page request');
  return answer;
};

describe('offline page request for a page that is not cached', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    const pagesCache = cacheOf({
      '/app/dashboard': 'the dashboard',
      '/~offline': 'the offline page',
    });
    const emptyCache = cacheOf({});
    globalThis.caches = {
      open: (name: string) => Promise.resolve(name === CACHE_NAMES.PAGES ? pagesCache : emptyCache),
      match: () => Promise.resolve(),
      delete: () => Promise.resolve(true),
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
  });

  it('shows the offline page instead of the dashboard under the wrong address', async () => {
    const response = await openPageOffline('/app/material');

    await expect(response.text()).resolves.toBe('the offline page');
  });

  it('still serves the page itself when it is cached', async () => {
    const response = await openPageOffline('/app/dashboard');

    await expect(response.text()).resolves.toBe('the dashboard');
  });
});
