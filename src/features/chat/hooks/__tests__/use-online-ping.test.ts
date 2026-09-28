/**
 * @jest-environment jsdom
 */

import { useOnlinePing } from '@/features/chat/hooks/use-online-ping';
import { act, renderHook } from '@testing-library/react';

const mockPing = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: (): unknown => ({ status: 'authenticated' }),
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    chat: { onlinePing: { useMutation: (): unknown => ({ mutate: mockPing }) } },
  },
}));

describe('useOnlinePing', () => {
  let visibilityState: DocumentVisibilityState = 'visible';

  const setVisibility = (state: DocumentVisibilityState): void => {
    visibilityState = state;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  beforeAll(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockPing.mockClear();
    visibilityState = 'visible';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pings at once and then often enough to stay inside the 30 s online window', () => {
    const { unmount } = renderHook(() => useOnlinePing());
    expect(mockPing).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(25_000);
    });
    expect(mockPing).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('stops pinging while the app is in the background', () => {
    const { unmount } = renderHook(() => useOnlinePing());
    mockPing.mockClear();

    setVisibility('hidden');
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(mockPing).not.toHaveBeenCalled();
    unmount();
  });

  it('pings at once when the app comes back to the foreground', () => {
    visibilityState = 'hidden';
    const { unmount } = renderHook(() => useOnlinePing());
    expect(mockPing).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(mockPing).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(25_000);
    });
    expect(mockPing).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('stops pinging when the chat is closed', () => {
    const { unmount } = renderHook(() => useOnlinePing());
    unmount();
    mockPing.mockClear();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(mockPing).not.toHaveBeenCalled();
  });
});
