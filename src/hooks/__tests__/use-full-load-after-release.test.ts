/**
 * @jest-environment jsdom
 */

import { useFullLoadAfterRelease } from '@/hooks/use-full-load-after-release';
import { assignLocation } from '@/utils/assign-location';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { act, renderHook } from '@testing-library/react';

jest.mock('@/utils/assign-location', () => ({ assignLocation: jest.fn() }));

const OLD_BUILD = '1_50_0-746eda89';
const NEW_BUILD = '1_51_0-3d6ff016';

describe('useFullLoadAfterRelease', () => {
  const worker = new EventTarget();
  const askedWorker = jest.fn();

  beforeAll(() => {
    Object.assign(worker, { controller: { postMessage: askedWorker } });
    Object.defineProperty(navigator, 'serviceWorker', { value: worker, configurable: true });
  });

  beforeEach(() => {
    jest.mocked(assignLocation).mockClear();
    askedWorker.mockClear();
    document.documentElement.dataset['dplId'] = OLD_BUILD;
    globalThis.history.replaceState(null, '', '/app/dashboard');
  });

  const workerSays = (serverBuild: string): void => {
    act(() => {
      worker.dispatchEvent(
        new MessageEvent('message', {
          data: { type: ServiceWorkerMessages.BUILD_STATUS, payload: { serverBuild } },
        }),
      );
    });
  };

  /**
   * After a release, a cold start on slow wifi showed the previous build's page from the cache,
   * and some taps on it never reached the new build, so the app stopped navigating.
   */
  it('loads the next page from the server once the server runs another build', () => {
    const { unmount } = renderHook(() => {
      useFullLoadAfterRelease();
    });
    workerSays(NEW_BUILD);

    // what the router does for a link tap or router.push once it committed the next page
    globalThis.history.pushState(null, '', '/app/map');

    expect(assignLocation).toHaveBeenCalledWith('http://localhost/app/map');
    expect(globalThis.location.pathname).toBe('/app/dashboard');
    unmount();
  });

  it('asks the worker, which may have learned the server build before the page listened', () => {
    const { unmount } = renderHook(() => {
      useFullLoadAfterRelease();
    });
    expect(askedWorker).toHaveBeenCalledWith({ type: ServiceWorkerMessages.BUILD_STATUS });
    unmount();
  });

  it('keeps navigating on the client while the page runs the server build', () => {
    const { unmount } = renderHook(() => {
      useFullLoadAfterRelease();
    });
    workerSays(OLD_BUILD);

    globalThis.history.pushState(null, '', '/app/map');

    expect(assignLocation).not.toHaveBeenCalled();
    expect(globalThis.location.pathname).toBe('/app/map');
    unmount();
  });

  it('leaves the router state the page writes to its own entry alone', () => {
    const { unmount } = renderHook(() => {
      useFullLoadAfterRelease();
    });
    workerSays(NEW_BUILD);

    globalThis.history.pushState({ scroll: 1 }, '', '/app/dashboard#top');

    expect(assignLocation).not.toHaveBeenCalled();
    unmount();
  });

  it('keeps navigating from the cache while the network does not answer', () => {
    const { unmount } = renderHook(() => {
      useFullLoadAfterRelease();
    });
    workerSays(NEW_BUILD);
    const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    globalThis.history.pushState(null, '', '/app/map');

    expect(assignLocation).not.toHaveBeenCalled();
    onLine.mockRestore();
    unmount();
  });
});
