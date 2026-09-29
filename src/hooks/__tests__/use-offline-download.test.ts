/**
 * @jest-environment jsdom
 */
// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
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

  it('no longer reports the content as downloaded', async () => {
    const existing = new Set<string>([
      CACHE_NAMES.PAGES,
      CACHE_NAMES.RSC,
      CACHE_NAMES.MAP_TILES,
      CACHE_NAMES.OFFLINE_ASSETS,
      CACHE_NAMES.OFFLINE_STATUS,
    ]);
    globalThis.caches = {
      delete: (name: string) => Promise.resolve(existing.delete(name)),
    } as unknown as CacheStorage;
    const { result } = renderHook(() => useOfflineDownload());

    await act(() => result.current.deleteContent());

    // the service worker reads the "download done" flag from this cache
    expect(existing.has(CACHE_NAMES.OFFLINE_STATUS)).toBe(false);
    expect(existing.has(CACHE_NAMES.PAGES)).toBe(false);
  });
});
