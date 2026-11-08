import { addAppModeClient } from '@/features/service-worker/app-mode';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

// The map module reads the worker's `self.location` on load; no request below is a map tile.
jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';
const APP_CLIENT = 'installed-app-window';
const WEB_CLIENT = 'browser-tab';
const PREVIOUS = '1_52_2-1c0debb1';
const CURRENT = '1_53_2-b58722ed';

/**
 * The browser's HTTP cache as the worker's `fetch()` meets it: Next.js answers a prefetch with
 * `s-maxage=900, stale-while-revalidate=85500`, which a browser keeps as stale but usable, under a
 * URL that is the same in every build. So a request that may use the cache gets the answer the
 * previous build left there, and only one that opts out reaches the server, which runs `CURRENT`.
 */
const browserFetch = jest.fn((input: RequestInfo | URL) => {
  const request = new Request(input);
  const build = request.cache === 'no-store' ? CURRENT : PREVIOUS;
  return Promise.resolve(
    new Response(`segment of ${build}`, {
      headers: {
        'Content-Type': 'text/x-component',
        'Cache-Control': 's-maxage=900, stale-while-revalidate=85500',
        'x-nextjs-deployment-id': build,
      },
    }),
  );
});

/** Serwist's route for Flight requests outside App Mode is `NetworkOnly`: a plain fetch. */
const serwist = {
  handleRequest: ({ request }: { request: Request }) => fetch(request),
} as unknown as Serwist;

const prefetch = async (clientId: string): Promise<Response> => {
  const event = {
    request: new Request(`${ORIGIN}/app/helper-portal?_rsc=e4pWspdc5ZQqnb5J`, {
      headers: {
        RSC: '1',
        'Next-Router-Prefetch': '1',
        'Next-Router-Segment-Prefetch': '/_full',
        'x-deployment-id': CURRENT,
      },
    }),
    clientId,
    resultingClientId: '',
    respondWith: jest.fn(),
    waitUntil: jest.fn(),
  };
  handleFetchEvent(serwist)(event as unknown as FetchEvent);
  const [answer] = event.respondWith.mock.calls[0] as [Promise<Response>];
  return answer;
};

describe('Flight answers after a release', () => {
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    Object.assign(globalThis, {
      self: { location: { origin: ORIGIN } },
      caches: { open: () => Promise.resolve({ match: () => Promise.resolve() }) },
    });
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
    addAppModeClient(APP_CLIENT);
  });

  beforeEach(() => {
    globalThis.fetch = browserFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('a page of the app gets the prefetch of its own build, not the one the last build left in the HTTP cache', async () => {
    const response = await prefetch(APP_CLIENT);

    expect(response.headers.get('x-nextjs-deployment-id')).toBe(CURRENT);
    expect(await response.text()).toBe(`segment of ${CURRENT}`);
  });

  test('so does a page of the website', async () => {
    const response = await prefetch(WEB_CLIENT);

    expect(response.headers.get('x-nextjs-deployment-id')).toBe(CURRENT);
  });
});
