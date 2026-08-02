/**
 * @jest-environment jsdom
 */

import { useNativePush } from '@/hooks/use-native-push';
import { act, renderHook } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({
    push: mockPush,
  }),
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    nativePush: {
      registerDevice: {
        useMutation: jest.fn().mockReturnValue({ mutateAsync: jest.fn() }),
      },
      unregisterDevice: {
        useMutation: jest.fn().mockReturnValue({ mutateAsync: jest.fn() }),
      },
    },
  },
}));

describe('useNativePush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };
  });

  afterEach(() => {
    globalThis.AppWebViewNativePush = undefined;
  });

  it('navigates to relative URL on native-push-open event', () => {
    renderHook(() => useNativePush());

    const event = new CustomEvent('app-webview-native-push-event', {
      detail: {
        type: 'native-push-open',
        payload: { url: '/app/chat/123' },
      },
    });

    act(() => {
      globalThis.dispatchEvent(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/app/chat/123');
  });

  it('parses absolute URL and navigates to target path on native-push-open event', () => {
    renderHook(() => useNativePush());

    const event = new CustomEvent('app-webview-native-push-event', {
      detail: {
        type: 'native-push-open',
        payload: { url: 'https://konekta.ch/app/chat/550e8400-e29b-41d4-a716-446655440000' },
      },
    });

    act(() => {
      globalThis.dispatchEvent(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/app/chat/550e8400-e29b-41d4-a716-446655440000');
  });

  it('falls back to /app/dashboard when payload url is missing or invalid', () => {
    renderHook(() => useNativePush());

    const event = new CustomEvent('app-webview-native-push-event', {
      detail: {
        type: 'native-push-open',
        payload: {},
      },
    });

    act(() => {
      globalThis.dispatchEvent(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/app/dashboard');
  });

  it('sets isUnauthenticated to true when registerDevice fails with authentication error', async () => {
    const mockRegisterDevice = jest.fn().mockRejectedValue(new Error('User not authenticated'));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const trpcMock = jest.requireMock('@/trpc/client');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    trpcMock.trpc.nativePush.registerDevice.useMutation.mockReturnValue({
      mutateAsync: mockRegisterDevice,
    });

    const { result } = renderHook(() => useNativePush());

    await act(async () => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-token',
            payload: { token: 'sample-token', platform: 'ios' },
          },
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isRegisteredOnBackend).toBe(false);
    expect(result.current.isUnauthenticated).toBe(true);
    expect(result.current.lastError).toBeUndefined();
  });
});
