import { OFFLINE_ENABLED_FLAG, TIMEOUTS } from '@/features/service-worker/constants';
import { prefetchOfflinePages } from '@/features/service-worker/offline-support/prefetch';

// More pages than the download fetches at once, each with its own chunk.
const PAGE_COUNT = TIMEOUTS.PREFETCH_CONCURRENCY + 5;

jest.mock('@/features/service-worker/offline-support/offline-pages', () => ({
  // PREFETCH_CONCURRENCY (20) + 5; jest.mock factories cannot reach module scope.
  offlinePages: Array.from({ length: 25 }, (_, index) => `/app/page-${index}`),
}));

const chunkOf = (pageUrl: string): string =>
  `/_next/static/chunks/${pageUrl.replaceAll('/', '_')}.js`;

describe('offline download with many pages', () => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const originalNavigator = globalThis.navigator;
  const OriginalRequest = globalThis.Request;
  let cached: Set<string>;

  beforeEach(() => {
    cached = new Set();
    // Pages are keyed by their URL, assets by a Request; keep both as a path.
    const pathOf = (key: RequestInfo): string =>
      typeof key === 'string' ? key : new URL(key.url).pathname;
    const cache = {
      match: (key: RequestInfo) =>
        Promise.resolve(cached.has(pathOf(key)) ? new Response('cached') : undefined),
      put: (key: RequestInfo) => {
        cached.add(pathOf(key));
        return Promise.resolve();
      },
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    } as unknown as Cache;
    // A worker resolves a relative request URL against its origin; Node throws instead.
    globalThis.Request = class extends OriginalRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(typeof input === 'string' ? new URL(input, 'https://conveniat27.ch') : input, init);
      }
    };
    globalThis.caches = {
      open: () => Promise.resolve(cache),
      match: () => Promise.resolve(),
    } as unknown as CacheStorage;
    Object.defineProperty(globalThis, 'location', {
      value: new URL('https://conveniat27.ch'),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    globalThis.fetch = jest.fn((input: string) => {
      const url = new URL(input, 'https://conveniat27.ch');
      if (url.pathname.startsWith('/_next/static/')) {
        return Promise.resolve(new Response('chunk'));
      }
      return Promise.resolve(
        new Response(`<script src="${chunkOf(url.pathname)}"></script>`, {
          headers: { 'content-type': 'text/html' },
        }),
      );
    }) as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
    globalThis.Request = OriginalRequest;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'location');
    jest.restoreAllMocks();
  });

  it('finishes, with every page and its chunks cached', async () => {
    const progress: number[] = [];

    await prefetchOfflinePages('client', (_total, current) => progress.push(current));

    expect(progress).toHaveLength(PAGE_COUNT);
    for (let index = 0; index < PAGE_COUNT; index++) {
      expect(cached).toContain(`/app/page-${index}`);
      expect(cached).toContain(chunkOf(`/app/page-${index}`));
    }
    expect(cached).toContain(OFFLINE_ENABLED_FLAG);
  });
});
