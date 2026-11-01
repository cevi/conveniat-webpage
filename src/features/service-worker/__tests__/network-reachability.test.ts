import { CACHE_NAMES } from '@/features/service-worker/constants';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

const urlOf = (key: RequestInfo | URL): string => {
  if (typeof key === 'string') return new URL(key, ORIGIN).href;
  if (key instanceof URL) return key.href;
  return key.url;
};

/** One in-memory cache per name, so the worker's state survives a "restart" of the worker. */
const cacheStorage = (): { storage: CacheStorage; entries: Map<string, Map<string, Response>> } => {
  const entries = new Map<string, Map<string, Response>>();
  const cacheNamed = (name: string): Cache => {
    const cache = entries.get(name) ?? new Map<string, Response>();
    entries.set(name, cache);
    return {
      match: (key: RequestInfo | URL) => Promise.resolve(cache.get(urlOf(key))?.clone()),
      keys: () => Promise.resolve([...cache.keys()].map((url) => new Request(url))),
      put: (key: RequestInfo | URL, response: Response) => {
        cache.set(urlOf(key), response);
        return Promise.resolve();
      },
      delete: (key: RequestInfo | URL) => Promise.resolve(cache.delete(urlOf(key))),
    } as unknown as Cache;
  };
  const storage = {
    open: (name: string) => Promise.resolve(cacheNamed(name)),
    match: () => Promise.resolve(),
    delete: () => Promise.resolve(true),
  } as unknown as CacheStorage;
  return { storage, entries };
};

/** Loads a fresh worker, as the browser does after it stopped an idle one. */
const startWorker = async (): Promise<(event: FetchEvent) => void> => {
  jest.resetModules();
  const { handleFetchEvent } =
    await import('@/features/service-worker/offline-support/fetch-handler');
  return handleFetchEvent({} as Serwist);
};

/** Asks the worker for an app page the way the installed app does and records how long it took. */
const request = (
  worker: (event: FetchEvent) => void,
  path: string,
  init?: RequestInit,
): { answeredAfter: Promise<number>; lifetime: Promise<unknown>[] } => {
  let answer: Promise<Response> | undefined;
  const lifetime: Promise<unknown>[] = [];
  const startedAt = Date.now();
  worker({
    request: new Request(`${ORIGIN}${path}`, init),
    clientId: '',
    resultingClientId: '',
    respondWith: (response: Promise<Response>) => {
      answer = response;
    },
    waitUntil: (promise: Promise<unknown>) => {
      lifetime.push(promise);
    },
  } as unknown as FetchEvent);
  if (answer === undefined) throw new Error(`the worker did not answer ${path}`);
  return { answeredAfter: answer.then(() => Date.now() - startedAt), lifetime };
};

const rsc = { headers: { RSC: '1' } };
const DASHBOARD_RSC = '/app/dashboard?_rsc=a&app-mode=true';
const SCHEDULE_RSC = '/app/schedule?_rsc=b&app-mode=true';

describe('a network that stops answering', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;
  let messages: unknown[];
  let fetchMode: 'hang' | 'answer';

  beforeEach(() => {
    jest.useFakeTimers();
    messages = [];
    fetchMode = 'hang';
    globalThis.fetch = jest.fn(() =>
      fetchMode === 'hang'
        ? new Promise<Response>(() => {})
        : Promise.resolve(
            new Response('fresh', { headers: { 'Content-Type': 'text/x-component' } }),
          ),
    );
    const { storage, entries } = cacheStorage();
    globalThis.caches = storage;
    const rscCache = new Map<string, Response>([
      [`${ORIGIN}/app/dashboard?_rsc`, new Response('cached dashboard')],
      [`${ORIGIN}/app/schedule?_rsc`, new Response('cached schedule')],
    ]);
    entries.set(CACHE_NAMES.RSC, rscCache);
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    Object.defineProperty(globalThis, 'self', {
      value: {
        location: { origin: ORIGIN },
        clients: {
          matchAll: (): Promise<{ postMessage: (message: unknown) => void }[]> =>
            Promise.resolve([{ postMessage: (message: unknown) => messages.push(message) }]),
        },
      },
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

  it('pays the full wait once, then answers the next pages from the cache almost at once', async () => {
    const worker = await startWorker();

    const first = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await expect(first.answeredAfter).resolves.toBe(3000);

    const second = request(worker, SCHEDULE_RSC, rsc);
    await jest.advanceTimersByTimeAsync(500);
    await expect(second.answeredAfter).resolves.toBe(500);
  });

  it('waits the full time again once the network answers', async () => {
    const worker = await startWorker();
    const first = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await first.answeredAfter;

    fetchMode = 'answer';
    const answered = request(worker, SCHEDULE_RSC, rsc);
    await jest.advanceTimersByTimeAsync(0);
    await Promise.all(answered.lifetime);

    // the network answers again, so a slow response is worth the usual wait
    fetchMode = 'hang';
    const slow = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await expect(slow.answeredAfter).resolves.toBe(3000);
  });

  it('tells the open pages when the network stops answering and when it answers again', async () => {
    const worker = await startWorker();
    const first = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await first.answeredAfter;
    await jest.advanceTimersByTimeAsync(0);

    fetchMode = 'answer';
    const second = request(worker, SCHEDULE_RSC, rsc);
    await jest.advanceTimersByTimeAsync(0);
    await Promise.all(second.lifetime);

    expect(messages).toEqual([
      { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable: false } },
      { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable: true } },
    ]);
  });

  it('remembers a dead network across a restart of the worker', async () => {
    const firstWorker = await startWorker();
    const first = request(firstWorker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await first.answeredAfter;
    await jest.advanceTimersByTimeAsync(0);

    const restarted = await startWorker();
    const coldStart = request(restarted, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(500);
    await expect(coldStart.answeredAfter).resolves.toBe(500);
  });

  it('does not take a request the page cancelled for a dead network', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new DOMException('The user aborted a request.', 'AbortError')),
    );
    const worker = await startWorker();
    const cancelled = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(0);
    await cancelled.answeredAfter;
    await Promise.all(cancelled.lifetime);

    globalThis.fetch = jest.fn(() => new Promise<Response>(() => {}));
    const next = request(worker, SCHEDULE_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await expect(next.answeredAfter).resolves.toBe(3000);
  });
  it('tries the network when a page showing the offline banner asks again', async () => {
    const worker = await startWorker();
    const first = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await first.answeredAfter;
    await jest.advanceTimersByTimeAsync(0);

    // the uplink is back, but the page shows cached data and sends nothing by itself
    fetchMode = 'answer';
    const { reportNetworkStatus } =
      await import('@/features/service-worker/offline-support/network-reachability');
    const answers: unknown[] = [];
    await reportNetworkStatus({
      postMessage: (message: unknown) => answers.push(message),
    } as unknown as Client);

    expect(globalThis.fetch).toHaveBeenLastCalledWith('/status', expect.anything());
    // the page hears what the worker knew, then every page hears that the network is back
    expect(answers).toEqual([
      { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable: false } },
    ]);
    expect(messages.at(-1)).toEqual({
      type: ServiceWorkerMessages.NETWORK_STATUS,
      payload: { reachable: true },
    });
  });

  it('answers a page starting on a dead network at once, without waiting for the probe', async () => {
    const worker = await startWorker();
    const first = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await first.answeredAfter;

    const { reportNetworkStatus } =
      await import('@/features/service-worker/offline-support/network-reachability');
    const answers: unknown[] = [];
    void reportNetworkStatus({
      postMessage: (message: unknown) => answers.push(message),
    } as unknown as Client);
    await jest.advanceTimersByTimeAsync(0);

    expect(answers).toEqual([
      { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable: false } },
    ]);
    await jest.advanceTimersByTimeAsync(3000);
  });
  it('does not take a request from the outage that fails after the network came back', async () => {
    // wifi that comes back resets the connections a dead uplink left hanging
    let failStaleRequest: ((error: Error) => void) | undefined;
    globalThis.fetch = jest.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          failStaleRequest = reject;
        }),
    );
    const worker = await startWorker();
    const stale = request(worker, DASHBOARD_RSC, rsc);
    await jest.advanceTimersByTimeAsync(3000);
    await stale.answeredAfter;

    fetchMode = 'answer';
    globalThis.fetch = jest.fn(() =>
      Promise.resolve(new Response('fresh', { headers: { 'Content-Type': 'text/x-component' } })),
    );
    const answered = request(worker, SCHEDULE_RSC, rsc);
    await jest.advanceTimersByTimeAsync(0);
    await Promise.all(answered.lifetime);

    failStaleRequest?.(new TypeError('Failed to fetch'));
    await jest.advanceTimersByTimeAsync(0);
    await Promise.allSettled(stale.lifetime);

    expect(messages.at(-1)).toEqual({
      type: ServiceWorkerMessages.NETWORK_STATUS,
      payload: { reachable: true },
    });
  });
});
