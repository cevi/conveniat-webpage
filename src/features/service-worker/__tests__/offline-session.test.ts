import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** Asks the worker for the session while the network is unreachable. */
const requestSessionOffline = async (): Promise<unknown> => {
  let answer: Promise<Response> | undefined;
  const event = {
    request: new Request(`${ORIGIN}/api/auth/session`),
    clientId: '',
    resultingClientId: '',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the session request');
  const response = await answer;
  return response.json();
};

const cachesWithSession = (session?: unknown): CacheStorage => {
  const cachedSession = session === undefined ? undefined : new Response(JSON.stringify(session));
  const authCache = {
    match: jest.fn(() => Promise.resolve(cachedSession)),
    put: jest.fn(() => Promise.resolve()),
  };
  return {
    open: jest.fn(() => Promise.resolve(authCache)),
    match: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve(true)),
  } as unknown as CacheStorage;
};

describe('service worker session while offline', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;

  beforeEach(() => {
    globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  });

  it('reports nobody logged in when no session was ever cached on this phone', async () => {
    globalThis.caches = cachesWithSession();

    await expect(requestSessionOffline()).resolves.toBeNull();
  });

  it('keeps the logged-in user of this phone signed in', async () => {
    globalThis.caches = cachesWithSession({
      user: { name: 'Lena Muster' },
      expires: '2000-01-01T00:00:00.000Z',
    });

    await expect(requestSessionOffline()).resolves.toMatchObject({
      user: { name: 'Lena Muster' },
    });
  });
});
