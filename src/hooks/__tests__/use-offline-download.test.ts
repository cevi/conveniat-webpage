/**
 * @jest-environment jsdom
 */
import { useOfflineDownload } from '@/hooks/use-offline-download';
import { act, renderHook } from '@testing-library/react';

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
