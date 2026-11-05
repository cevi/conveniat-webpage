/**
 * @jest-environment jsdom
 */

import { usePushNavigation } from '@/hooks/use-push-navigation';
import { assignLocation } from '@/utils/assign-location';
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { Suspense, use, useState } from 'react';

jest.mock('@/utils/assign-location', () => ({ assignLocation: jest.fn() }));

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: (): unknown => ({ push }) }));

const moveTo = (href: string): void => {
  globalThis.history.replaceState({}, '', href);
};

let originalHref: string;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  sessionStorage.clear();
  localStorage.clear();
  originalHref = globalThis.location.href;
  moveTo('/app/dashboard');
});

afterEach(() => {
  moveTo(originalHref);
  jest.restoreAllMocks();
});

describe('usePushNavigation', () => {
  it('routes a target on this origin softly and forgets it once there', () => {
    push.mockImplementation((target: string) => moveTo(target));
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget('/app/schedule?day=2#details'));

    expect(push).toHaveBeenCalledWith('/app/schedule?day=2#details');
    expect(assignLocation).not.toHaveBeenCalled();
    expect(localStorage.getItem('pending_push_redirect')).toBeNull();
  });

  it('does not load the page anew while the router is still fetching the target', async () => {
    // The page the router moves to suspends until its payload arrives, as on slow wifi.
    let setNextPage: ((page: Promise<void>) => void) | undefined;
    let deliverPayload: (() => void) | undefined;
    const NextPage: React.FC = () => {
      const [page, setPage] = useState<Promise<void>>();
      setNextPage = setPage;
      if (page !== undefined) use(page);
      return <></>;
    };
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <>
        <Suspense fallback={<></>}>
          <NextPage />
        </Suspense>
        {children}
      </>
    );
    push.mockImplementation((target: string) => {
      setNextPage?.(
        new Promise<void>((resolve) => {
          deliverPayload = (): void => {
            moveTo(target);
            resolve();
          };
        }),
      );
    });
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => usePushNavigation(), { wrapper });

      // Longer than any fixed fallback a slow phone would have to beat.
      await act(async () => {
        result.current.navigateToPushTarget('/app/chat/abc');
        await jest.advanceTimersByTimeAsync(10_000);
      });
      expect(assignLocation).not.toHaveBeenCalled();
      expect(localStorage.getItem('pending_push_redirect')).toBe('/app/chat/abc');

      await act(async () => {
        deliverPayload?.();
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(assignLocation).not.toHaveBeenCalled();
      expect(localStorage.getItem('pending_push_redirect')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('loads the target when the router ends without getting anywhere', () => {
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget('/app/schedule'));

    expect(assignLocation).toHaveBeenCalledWith('/app/schedule');
  });

  it('loads the target when the router is not ready', () => {
    push.mockImplementation(() => {
      throw new Error('Router action dispatched before initialization.');
    });
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget('/app/schedule'));

    expect(assignLocation).toHaveBeenCalledWith('/app/schedule');
  });

  it('leaves a page someone else moved to, like a redirect', () => {
    push.mockImplementation(() => moveTo('/app/login'));
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget('/app/schedule'));

    expect(assignLocation).not.toHaveBeenCalled();
    expect(localStorage.getItem('pending_push_redirect')).toBeNull();
  });

  it('never hands a javascript: URL to the browser', () => {
    push.mockImplementation((target: string) => moveTo(target));
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget('javascript:alert(document.domain)'));

    expect(push).toHaveBeenCalledWith('/app/dashboard');
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('treats a slash-backslash target as the other origin a browser reads it as', () => {
    const { result } = renderHook(() => usePushNavigation());

    act(() => result.current.navigateToPushTarget(String.raw`/\example.org/login`));

    expect(push).not.toHaveBeenCalled();
    expect(assignLocation).toHaveBeenCalledWith('http://example.org/login');
    expect(localStorage.getItem('pending_push_redirect')).toBeNull();
  });

  it('does not follow a link on this origin whose path names another origin', () => {
    push.mockImplementation((target: string) => moveTo(target));
    const { result } = renderHook(() => usePushNavigation());

    act(() =>
      result.current.navigateToPushTarget(`${globalThis.location.origin}//example.org/login`),
    );

    expect(push).toHaveBeenCalledWith('/app/dashboard');
  });

  describe('resuming a remembered target', () => {
    it('opens a target that differs from the current page only by its query', () => {
      moveTo('/app/schedule');
      localStorage.setItem('pending_push_redirect', '/app/schedule?id=123');
      push.mockImplementation((target: string) => moveTo(target));
      const { result } = renderHook(() => usePushNavigation());

      act(() => result.current.resumePendingPushNavigation());

      expect(push).toHaveBeenCalledWith('/app/schedule?id=123');
      expect(localStorage.getItem('pending_push_redirect')).toBeNull();
    });

    it('forgets a target the page already shows', () => {
      moveTo('/app/chat/abc/details');
      localStorage.setItem('pending_push_redirect', '/app/chat/abc?app-mode=true');
      const { result } = renderHook(() => usePushNavigation());

      act(() => result.current.resumePendingPushNavigation());

      expect(push).not.toHaveBeenCalled();
      expect(localStorage.getItem('pending_push_redirect')).toBeNull();
    });
  });
});
