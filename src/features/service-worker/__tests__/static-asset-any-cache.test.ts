import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';
const CHUNK = '/_next/static/chunks/0lrci0jh8m-rr.js';

describe('a hashed chunk the offline download stored', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    // stored by the offline download, in a cache Serwist's JS route does not look in
    globalThis.caches = {
      open: jest.fn(() =>
        Promise.resolve({ match: () => Promise.resolve(), keys: () => Promise.resolve([]) }),
      ),
      match: jest.fn((request: Request | string) =>
        Promise.resolve(
          (typeof request === 'string' ? request : request.url).endsWith(CHUNK)
            ? new Response('chunk from the offline download')
            : undefined,
        ),
      ),
    } as unknown as CacheStorage;
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    Object.defineProperty(globalThis, 'self', {
      value: { location: { origin: ORIGIN } },
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

  it('is answered from that cache, not from a network that never answers', async () => {
    // wifi without an uplink: Serwist's route would go to the network and wait forever
    const handleRequest = jest.fn(() => new Promise<Response>(() => {}));
    let answer: Promise<Response> | undefined;
    handleFetchEvent({ handleRequest } as unknown as Serwist)({
      request: new Request(`${ORIGIN}${CHUNK}`),
      clientId: '',
      resultingClientId: '',
      respondWith: (response: Promise<Response>) => {
        answer = response;
      },
      waitUntil: jest.fn(),
    } as unknown as FetchEvent);

    const response = await answer;
    await expect(response?.text()).resolves.toBe('chunk from the offline download');
    expect(handleRequest).not.toHaveBeenCalled();
  });
});
