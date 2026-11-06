import { CACHE_NAMES } from '@/features/service-worker/constants';
import { staleBuildPagePlugin } from '@/features/service-worker/offline-support/build-skew-reporting';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';
const OLD_BUILD = '1_50_0-746eda89';
const NEW_BUILD = '1_51_0-3d6ff016';

const page = (build: string): Response =>
  new Response(
    `<!DOCTYPE html><html lang="de" data-dpl-id="${build}"><body>dashboard</body></html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );

const urlOf = (key: RequestInfo | URL): string => {
  if (typeof key === 'string') return key;
  if (key instanceof URL) return key.href;
  return key.url;
};

/** Cache Storage whose page cache holds the dashboard as the previous build rendered it. */
const cachesWithDashboardOf = (build: string): CacheStorage => {
  const pages = new Map([[`${ORIGIN}/app/dashboard`, page(build)]]);
  const cacheNamed = (name: string): Cache =>
    ({
      match: (key: RequestInfo | URL) =>
        Promise.resolve(
          name === CACHE_NAMES.PAGES
            ? pages.get(urlOf(key).split('?')[0] ?? '')?.clone()
            : undefined,
        ),
      keys: () =>
        Promise.resolve(
          name === CACHE_NAMES.PAGES ? [...pages.keys()].map((url) => new Request(url)) : [],
        ),
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(true),
    }) as unknown as Cache;
  return {
    open: (name: string) => Promise.resolve(cacheNamed(name)),
    match: () => Promise.resolve(),
    delete: () => Promise.resolve(true),
  } as unknown as CacheStorage;
};

interface Sent {
  clientId: string;
  message: { type: string; payload: { event: string; properties: Record<string, unknown> } };
}

/** Runs one request through the worker, as page `clientId` (or a page it loads) sends it. */
const send = (
  request: Request,
  { clientId = '', resultingClientId = '' } = {},
): { answer: Promise<Response>; lifetime: Promise<unknown>[] } => {
  let answer: Promise<Response> | undefined;
  const lifetime: Promise<unknown>[] = [];
  handleFetchEvent({} as Serwist)({
    request,
    clientId,
    resultingClientId,
    respondWith: (response: Promise<Response>) => {
      answer = response;
    },
    waitUntil: (promise: Promise<unknown>) => {
      lifetime.push(promise);
    },
  } as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer');
  return { answer, lifetime };
};

/** The installed app opening the dashboard, as on a cold start. */
const openDashboard = (): Request => {
  const request = new Request(`${ORIGIN}/app/dashboard?app-mode=true`);
  Object.defineProperty(request, 'destination', { value: 'document' });
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  return request;
};

/** The router of a page of `build` asking for the map. */
const askForMap = (build: string): Request =>
  new Request(`${ORIGIN}/app/map?_rsc=NabomWdC_g4_NgeD&app-mode=true`, {
    headers: { RSC: '1', 'x-deployment-id': build },
  });

describe('reporting pages of an outdated build to PostHog', () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;
  let sent: Sent[];

  beforeEach(() => {
    jest.useFakeTimers();
    sent = [];
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    Object.defineProperty(globalThis, 'self', {
      value: {
        location: { origin: ORIGIN },
        clients: {
          get: (clientId: string) => Promise.resolve(openPage(clientId)),
          // the one open app page, which WebKit gives no id to while it loads
          matchAll: () => Promise.resolve([openPage('open-dashboard')]),
        },
      },
      configurable: true,
    });
  });

  const openPage = (clientId: string): Pick<WindowClient, 'id' | 'url' | 'postMessage'> => ({
    id: clientId,
    url: `${ORIGIN}/app/dashboard`,
    postMessage: (message: Sent['message']) => sent.push({ clientId, message }),
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

  const events = (name: string): Sent[] =>
    sent.filter(
      ({ message }) =>
        message.type === ServiceWorkerMessages.CAPTURE_POSTHOG_EVENT &&
        message.payload.event === name,
    );

  /** The pages told which build the server runs, so an outdated one loads its next page fully. */
  const toldServerBuild = (): { clientId: string; serverBuild: unknown }[] =>
    sent
      .filter(({ message }) => message.type === ServiceWorkerMessages.BUILD_STATUS)
      .map(({ clientId, message }) => ({
        clientId,
        serverBuild: (message.payload as unknown as { serverBuild: unknown }).serverBuild,
      }));

  /**
   * After a release, a cold start on slow wifi served the previous build's dashboard from the
   * cache. Some taps on that page never reloaded it, so it stopped navigating.
   */
  it('reports a cached page of another build and tells the pages once the network answers', async () => {
    globalThis.caches = cachesWithDashboardOf(OLD_BUILD);
    globalThis.fetch = jest.fn(
      () => new Promise<Response>((resolve) => setTimeout(() => resolve(page(NEW_BUILD)), 5000)),
    );

    const { answer, lifetime } = send(openDashboard(), { resultingClientId: 'ipad-page' });
    await jest.advanceTimersByTimeAsync(3000);
    const shown = await answer;
    await expect(shown.text()).resolves.toContain(OLD_BUILD);

    await jest.advanceTimersByTimeAsync(2000);
    await Promise.all(lifetime);

    expect(events('stale_build_page_served')).toEqual([
      expect.objectContaining({
        clientId: 'ipad-page',
        message: expect.objectContaining({
          payload: {
            event: 'stale_build_page_served',
            properties: expect.objectContaining({
              path: '/app/dashboard',
              cached_build: OLD_BUILD,
              server_build: NEW_BUILD,
            }) as unknown,
          },
        }) as unknown,
      }),
    ]);
    // not reloaded under the user's fingers; the page loads its next page from the server
    expect(toldServerBuild()).toEqual([{ clientId: 'open-dashboard', serverBuild: NEW_BUILD }]);
  });

  /** WebKit, which the iPad runs, leaves `resultingClientId` empty for a navigation. */
  it('finds the page by its path when the browser names no page for the navigation', async () => {
    globalThis.caches = cachesWithDashboardOf(OLD_BUILD);
    globalThis.fetch = jest.fn(
      () => new Promise<Response>((resolve) => setTimeout(() => resolve(page(NEW_BUILD)), 5000)),
    );

    const { lifetime } = send(openDashboard(), { resultingClientId: '' });
    await jest.advanceTimersByTimeAsync(5000);
    await Promise.all(lifetime);

    expect(events('stale_build_page_served')).toEqual([
      expect.objectContaining({ clientId: 'open-dashboard' }),
    ]);
  });

  /**
   * In WebKit the worker cannot tell the app's page loads apart, so they go through Serwist's
   * page route: on its timeout it serves the cached copy and lets the network request run on.
   */
  it('tells the pages when Serwist served a cached page of another build', async () => {
    const lifetime: Promise<unknown>[] = [];
    const event = {
      resultingClientId: '',
      waitUntil: (promise: Promise<unknown>) => lifetime.push(promise),
    } as unknown as ExtendableEvent;
    const request = new Request(`${ORIGIN}/app/dashboard`);
    const state = {};
    const hooks = staleBuildPagePlugin as Required<typeof staleBuildPagePlugin>;

    await hooks.requestWillFetch({ request, event, state });
    await hooks.cachedResponseWillBeUsed({
      cacheName: CACHE_NAMES.PAGES,
      request,
      cachedResponse: page(OLD_BUILD),
      event,
      state,
    });
    await hooks.fetchDidSucceed({ request, response: page(NEW_BUILD), event, state });
    await Promise.all(lifetime);

    expect(toldServerBuild()).toEqual([{ clientId: 'open-dashboard', serverBuild: NEW_BUILD }]);
  });

  it('leaves a page alone that Serwist got from the network in time', async () => {
    const lifetime: Promise<unknown>[] = [];
    const event = {
      waitUntil: (promise: Promise<unknown>) => lifetime.push(promise),
    } as unknown as ExtendableEvent;
    const request = new Request(`${ORIGIN}/app/dashboard`);
    const state = {};
    const hooks = staleBuildPagePlugin as Required<typeof staleBuildPagePlugin>;

    await hooks.requestWillFetch({ request, event, state });
    await hooks.fetchDidSucceed({ request, response: page(NEW_BUILD), event, state });
    await Promise.all(lifetime);

    expect(toldServerBuild()).toEqual([]);
  });

  it('leaves a cached page of the build the server runs alone', async () => {
    globalThis.caches = cachesWithDashboardOf(NEW_BUILD);
    globalThis.fetch = jest.fn(
      () => new Promise<Response>((resolve) => setTimeout(() => resolve(page(NEW_BUILD)), 5000)),
    );

    const { lifetime } = send(openDashboard(), { resultingClientId: 'ipad-page' });
    await jest.advanceTimersByTimeAsync(5000);
    await Promise.all(lifetime);

    expect(events('stale_build_page_served')).toEqual([]);
    expect(toldServerBuild()).toEqual([]);
  });

  it('reports a page whose requests the proxy turns away once, and tells the pages', async () => {
    globalThis.caches = cachesWithDashboardOf(OLD_BUILD);
    globalThis.fetch = jest.fn(() =>
      Promise.resolve(
        new Response('', { status: 409, headers: { 'x-server-deployment-id': NEW_BUILD } }),
      ),
    );

    for (let attempt = 0; attempt < 3; attempt++) {
      const { answer, lifetime } = send(askForMap(OLD_BUILD), { clientId: 'stuck-page' });
      const refused = await answer;
      expect(refused.status).toBe(409);
      await Promise.all(lifetime);
    }

    expect(events('deployment_skew_refused')).toEqual([
      expect.objectContaining({
        clientId: 'stuck-page',
        message: expect.objectContaining({
          payload: {
            event: 'deployment_skew_refused',
            properties: {
              path: '/app/map',
              client_build: OLD_BUILD,
              server_build: NEW_BUILD,
              prefetch: false,
            },
          },
        }) as unknown,
      }),
    ]);
    expect(toldServerBuild()).toContainEqual({
      clientId: 'open-dashboard',
      serverBuild: NEW_BUILD,
    });
  });
});
