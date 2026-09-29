import { TIMEOUTS } from '@/features/service-worker/constants';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** Dispatches a session request to the worker and returns what it answered with. */
const requestSession = (): Promise<Response> => {
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
  return answer;
};

/** A network that accepts the connection and then never answers, like a captive portal. */
const hangingFetch = (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });

describe('service worker session check', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;

  beforeEach(() => {
    jest.useFakeTimers();
    const cachedSession = new Response(
      JSON.stringify({ user: { name: 'Lena Muster' }, expires: '2000-01-01T00:00:00.000Z' }),
    );
    const authCache = {
      match: jest.fn().mockResolvedValue(cachedSession),
      put: jest.fn(),
    };
    globalThis.caches = {
      open: jest.fn().mockResolvedValue(authCache),
      match: jest.fn(() => Promise.resolve()),
      delete: jest.fn().mockResolvedValue(true),
    } as unknown as CacheStorage;
    globalThis.fetch = jest.fn(hangingFetch);
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  });

  it('answers from the cached session when the network hangs', async () => {
    const answer = requestSession();

    await jest.advanceTimersByTimeAsync(TIMEOUTS.SESSION_FETCH);
    const response = await answer;
    const session = (await response.json()) as { user?: { name?: string } };

    expect(session.user?.name).toBe('Lena Muster');
  });

  it('answers before the entrypoint gives up on the session', () => {
    // use-onboarding treats a session still loading after 3 s as logged out
    expect(TIMEOUTS.SESSION_FETCH).toBeLessThan(3000);
  });
});
