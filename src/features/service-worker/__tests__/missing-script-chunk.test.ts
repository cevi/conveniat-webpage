import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** An empty cache storage: the requested file was never cached. */
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

/** Requests `path` as the page does for a `<script>` or a `<link rel="stylesheet">`. */
const requestAsset = (path: string, destination: RequestDestination): Promise<Response> => {
  let answer: Promise<Response> | undefined;
  const event = {
    request: {
      url: `${ORIGIN}${path}`,
      method: 'GET',
      mode: 'no-cors',
      destination,
      headers: new Headers(),
    },
    clientId: 'client-1',
    resultingClientId: '',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  // The request is dropped on the way, as on wifi that is up but losing requests.
  const serwist = {
    handleRequest: jest.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  } as unknown as Serwist;
  handleFetchEvent(serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the request');
  return answer;
};

describe('a chunk that cannot be fetched and is in no cache', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    globalThis.caches = emptyCaches();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'self', {
      value: { location: { origin: ORIGIN } },
      configurable: true,
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'self');
    jest.restoreAllMocks();
  });

  // An empty script would load, and Turbopack would then miss its module factory, which the
  // page takes for a stale bundle instead of the dropped request it is.
  it('fails a script request instead of answering with an empty script', async () => {
    const response = await requestAsset('/_next/static/chunks/0jn6r.dy2amix.js', 'script');

    expect(response.type).toBe('error');
  });

  it('still answers a stylesheet with an empty one, so the page stays usable', async () => {
    const response = await requestAsset('/_next/static/chunks/0jn6r.dy2amix.css', 'style');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/css');
  });
});
