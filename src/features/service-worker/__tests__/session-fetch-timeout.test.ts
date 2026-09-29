import { TIMEOUTS } from '@/features/service-worker/constants';
import {
  forgetCachedSession,
  handleFetchEvent,
} from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** Dispatches a session request to the worker and returns what it answered with. */
const requestSession = (): { answer: Promise<Response>; lifetime: Promise<unknown>[] } => {
  let answer: Promise<Response> | undefined;
  const lifetime: Promise<unknown>[] = [];
  const event = {
    request: new Request(`${ORIGIN}/api/auth/session`),
    clientId: '',
    resultingClientId: '',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: (promise: Promise<unknown>): void => {
      lifetime.push(promise);
    },
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the session request');
  return { answer, lifetime };
};

const sessionOf = (name: string): Response =>
  new Response(JSON.stringify({ user: { name }, expires: '2000-01-01T00:00:00.000Z' }));

/** A network that accepts the connection and then never answers, like a captive portal. */
const hangingFetch = (): Promise<Response> => new Promise(() => {});

/** A network that answers with `name`'s session, but only after five seconds. */
const slowFetch = (name: string) => (): Promise<Response> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(sessionOf(name)), 5000);
  });

const nameIn = async (response: Response): Promise<string | undefined> => {
  const session = (await response.json()) as { user?: { name?: string } } | null;
  return session?.user?.name;
};

describe('service worker session check', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  let authCachePut: jest.Mock;

  const useCachedSession = (cached?: Response): void => {
    authCachePut = jest.fn(() => Promise.resolve());
    const authCache = {
      match: jest.fn(() => Promise.resolve(cached?.clone())),
      put: authCachePut,
    };
    globalThis.caches = {
      open: jest.fn(() => Promise.resolve(authCache)),
      match: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve(true)),
    } as unknown as CacheStorage;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  });

  it('answers from the cached session when the network hangs', async () => {
    useCachedSession(sessionOf('Lena Muster'));
    globalThis.fetch = jest.fn(hangingFetch);

    const { answer } = requestSession();
    await jest.advanceTimersByTimeAsync(TIMEOUTS.SESSION_FETCH);

    await expect(nameIn(await answer)).resolves.toBe('Lena Muster');
  });

  it('keeps waiting for the network when no session is cached', async () => {
    // Right after a login the cached session was just cleared; a slow answer must not turn
    // into "logged out".
    useCachedSession();
    globalThis.fetch = jest.fn(slowFetch('Lena Muster'));

    const { answer } = requestSession();
    await jest.advanceTimersByTimeAsync(5000);

    await expect(nameIn(await answer)).resolves.toBe('Lena Muster');
  });

  it('lets the late answer finish and refresh the cached session', async () => {
    useCachedSession(sessionOf('Lena Muster'));
    globalThis.fetch = jest.fn(slowFetch('Lena Muster'));

    const { answer, lifetime } = requestSession();
    await jest.advanceTimersByTimeAsync(TIMEOUTS.SESSION_FETCH);
    await answer;
    expect(authCachePut).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    await Promise.all(lifetime);
    expect(authCachePut).toHaveBeenCalledTimes(1);
  });

  it('does not keep a late answer that lands after a logout', async () => {
    useCachedSession(sessionOf('Lena Muster'));
    globalThis.fetch = jest.fn(slowFetch('Lena Muster'));

    const { answer, lifetime } = requestSession();
    await jest.advanceTimersByTimeAsync(TIMEOUTS.SESSION_FETCH);
    await answer;
    await forgetCachedSession();

    await jest.advanceTimersByTimeAsync(5000);
    await Promise.all(lifetime);
    expect(authCachePut).not.toHaveBeenCalled();
  });

  it('answers before the entrypoint gives up on the session', () => {
    // use-onboarding treats a session still loading after 3 s as logged out
    expect(TIMEOUTS.SESSION_FETCH).toBeLessThan(3000);
  });
});
