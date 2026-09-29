import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** An empty cache storage: nothing was ever downloaded for offline use. */
const emptyCaches = (): CacheStorage => {
  const emptyCache = {
    match: jest.fn(() => Promise.resolve()),
    keys: jest.fn(() => Promise.resolve([])),
    put: jest.fn(() => Promise.resolve()),
  };
  return {
    open: jest.fn(() => Promise.resolve(emptyCache)),
    match: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve(true)),
  } as unknown as CacheStorage;
};

/** Fetches `path` the way the Next.js router does, from a page showing `currentPage`. */
const routerFetchOffline = (currentPage: string, path: string): Promise<Response> => {
  Object.defineProperty(globalThis, 'self', {
    value: {
      location: { origin: ORIGIN },
      clients: {
        get: (): Promise<{ url: string }> => Promise.resolve({ url: `${ORIGIN}${currentPage}` }),
      },
    },
    configurable: true,
  });
  let answer: Promise<Response> | undefined;
  const event = {
    request: new Request(`${ORIGIN}${path}`, { headers: { RSC: '1' } }),
    clientId: 'client-1',
    resultingClientId: '',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the request');
  return answer;
};

describe('offline RSC request for a page that is not cached', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    globalThis.caches = emptyCaches();
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

  // With `experimental.useOffline`, a network error parks the navigation until the connection
  // returns. A non-OK answer makes the router load the page as a document instead, which the
  // worker can serve from its page cache or with the offline page.
  it('lets a tap to another page load it as a document instead of waiting forever', async () => {
    const response = await routerFetchOffline('/app/dashboard', '/app/material?_rsc=abc12');

    expect(response.type).not.toBe('error');
    expect(response.status).toBe(503);
  });

  // A query update on the page on screen or a refresh: the router should keep the page and
  // retry later, not reload it.
  it('keeps the page on screen for a request about that same page', async () => {
    const response = await routerFetchOffline(
      '/app/schedule?date=2027-07-26',
      '/app/schedule?date=2027-07-27&_rsc=abc12',
    );

    expect(response.type).toBe('error');
  });
});
