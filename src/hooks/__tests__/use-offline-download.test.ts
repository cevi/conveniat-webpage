/**
 * @jest-environment jsdom
 */
import { useOfflineDownload } from '@/hooks/use-offline-download';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/hooks/use-service-worker-status', () => ({
  useServiceWorkerStatus: (): object => ({ isReady: true, registration: undefined }),
}));
jest.mock('@/hooks/use-service-worker-message', () => ({
  useServiceWorkerMessage: jest.fn(),
}));

describe('deleting the offline content', () => {
  const originalCaches = globalThis.caches;

  afterEach(() => {
    globalThis.caches = originalCaches;
  });

  // The cache names the service worker uses, spelled out: src/hooks may not import from the
  // service worker feature.
  const PAGES = 'pages-cache-v1';
  const OFFLINE_STATUS = 'offline-status-cache-v1';

  it('no longer reports the content as downloaded', async () => {
    const existing = new Set<string>([PAGES, OFFLINE_STATUS]);
    globalThis.caches = {
      delete: (name: string) => Promise.resolve(existing.delete(name)),
    } as unknown as CacheStorage;
    const { result } = renderHook(() => useOfflineDownload());

    await act(() => result.current.deleteContent());

    // the service worker reads the "download done" flag from this cache
    expect(existing.has(OFFLINE_STATUS)).toBe(false);
    expect(existing.has(PAGES)).toBe(false);
  });
});

describe('the downloaded status on the settings page', () => {
  const originalCaches = globalThis.caches;

  afterEach(() => {
    globalThis.caches = originalCaches;
  });

  /** A cache storage with `pages` cached pages and, optionally, the "download done" flag. */
  const cachesWith = ({ pages, downloadDone }: { pages: number; downloadDone: boolean }): void => {
    globalThis.caches = {
      open: (name: string) =>
        Promise.resolve({
          keys: () =>
            Promise.resolve(
              name === 'pages-cache-v1'
                ? Array.from({ length: pages }, (_, index) => ({ url: `/page-${index}` }))
                : [],
            ),
          match: (key: string) =>
            Promise.resolve(
              // any stored entry; jsdom has no Response
              name === 'offline-status-cache-v1' && key === 'offline-enabled' && downloadDone
                ? { ok: true }
                : undefined,
            ),
        }),
    } as unknown as CacheStorage;
  };

  it('does not call a user who only browsed some pages downloaded', async () => {
    cachesWith({ pages: 12, downloadDone: false });
    const { result } = renderHook(() => useOfflineDownload({ checkCacheOnMount: true }));

    await act(() => Promise.resolve());

    expect(result.current.status).not.toBe('has-content');
  });

  it('shows the download as done once the service worker finished it', async () => {
    cachesWith({ pages: 3, downloadDone: true });
    const { result } = renderHook(() => useOfflineDownload({ checkCacheOnMount: true }));

    await waitFor(() => {
      expect(result.current.status).toBe('has-content');
    });
  });
});
