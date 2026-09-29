import { CACHE_NAMES } from '@/features/service-worker/constants';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';
const SCHEDULE_RSC = `${ORIGIN}/app/schedule?_rsc`;

const urlOf = (key: RequestInfo | URL): string => {
  if (typeof key === 'string') return key;
  if (key instanceof URL) return key.href;
  return key.url;
};

/** Cache Storage whose RSC cache optionally holds yesterday's schedule. */
const cachesWith = (
  rscEntries: Map<string, Response>,
): { storage: CacheStorage; writes: string[] } => {
  const writes: string[] = [];
  const rscCache = {
    match: (key: RequestInfo | URL): Promise<Response | undefined> =>
      Promise.resolve(rscEntries.get(urlOf(key))?.clone()),
    keys: (): Promise<Request[]> =>
      Promise.resolve([...rscEntries.keys()].map((url) => new Request(url))),
    put: (key: RequestInfo | URL, response: Response): Promise<void> => {
      writes.push(urlOf(key));
      rscEntries.set(urlOf(key), response);
      return Promise.resolve();
    },
  };
  const emptyCache = {
    match: (): Promise<void> => Promise.resolve(),
    keys: (): Promise<Request[]> => Promise.resolve([]),
    put: (): Promise<void> => Promise.resolve(),
  };
  const storage = {
    open: (name: string): Promise<unknown> =>
      Promise.resolve(name === CACHE_NAMES.RSC ? rscCache : emptyCache),
    match: (): Promise<void> => Promise.resolve(),
    delete: (): Promise<boolean> => Promise.resolve(true),
  } as unknown as CacheStorage;
  return { storage, writes };
};

/** Navigates to the schedule inside the installed app, the way the Next.js router asks. */
const navigateInApp = (): { answer: Promise<Response>; lifetime: Promise<unknown>[] } => {
  let answer: Promise<Response> | undefined;
  const lifetime: Promise<unknown>[] = [];
  const event = {
    request: new Request(`${ORIGIN}/app/schedule?_rsc=abc12&app-mode=true`, {
      headers: { RSC: '1' },
    }),
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
  if (answer === undefined) throw new Error('the worker did not answer the navigation');
  return { answer, lifetime };
};

/** A network that answers, but only after five seconds. */
const slowFetch = (): Promise<Response> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Response('fresh schedule', { headers: { 'Content-Type': 'text/x-component' } }));
    }, 5000);
  });

describe('app navigation on a slow network', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(slowFetch);
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'self', {
      value: { location: { origin: ORIGIN } },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'self');
  });

  it('shows the cached page meanwhile and still stores the fresh one when it arrives', async () => {
    const { storage, writes } = cachesWith(
      new Map([[SCHEDULE_RSC, new Response('yesterday schedule')]]),
    );
    globalThis.caches = storage;

    const { answer, lifetime } = navigateInApp();
    await jest.advanceTimersByTimeAsync(3000);
    const shown = await answer;

    await expect(shown.text()).resolves.toBe('yesterday schedule');

    await jest.advanceTimersByTimeAsync(2000);
    await Promise.all(lifetime);
    expect(writes).toContain(`${ORIGIN}/app/schedule?_rsc=abc12&app-mode=true`);
  });

  it('waits for the network when nothing is cached instead of giving up', async () => {
    const { storage } = cachesWith(new Map());
    globalThis.caches = storage;

    const { answer } = navigateInApp();
    await jest.advanceTimersByTimeAsync(5000);
    const shown = await answer;

    expect(shown.status).toBe(200);
    await expect(shown.text()).resolves.toBe('fresh schedule');
  });

  it('stops waiting after a while on wifi that has no working uplink', async () => {
    const { storage } = cachesWith(new Map());
    globalThis.caches = storage;
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => {}));

    const { answer } = navigateInApp();
    let answered = false;
    void answer.then(() => {
      answered = true;
    });

    await jest.advanceTimersByTimeAsync(10_000);
    expect(answered).toBe(false);
    await jest.advanceTimersByTimeAsync(5000);
    expect(answered).toBe(true);
  });
});
