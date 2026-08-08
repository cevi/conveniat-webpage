/**
 * @jest-environment jsdom
 */

import { extractNotificationTitleAndBody, useNativePush } from '@/hooks/use-native-push';
import { reloadPage } from '@/utils/reload-page';
import { act, renderHook } from '@testing-library/react';

jest.mock('@/utils/reload-page', () => ({
  reloadPage: jest.fn(),
}));

const mockPush = jest.fn();
const mockNotification = jest.fn();

beforeAll(() => {
  // @ts-expect-error Mocking global Notification constructor
  globalThis.Notification = jest.fn().mockImplementation((title, options) => {
    mockNotification(title, options);
    return { addEventListener: jest.fn() };
  });
  // @ts-expect-error Mocking Notification permission
  globalThis.Notification.permission = 'granted';
});

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({
    push: mockPush,
  }),
}));

jest.mock('@/trpc/client', () => ({
  useOptionalTrpcUtils: jest.fn(),
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

  it('prioritizes chatId over generic fallback dashboard url', () => {
    renderHook(() => useNativePush());

    const event = new CustomEvent('app-webview-native-push-event', {
      detail: {
        type: 'native-push-open',
        payload: {
          url: '/app/dashboard',
          chatId: 'target-chat-id-123',
        },
      },
    });

    act(() => {
      globalThis.dispatchEvent(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/app/chat/target-chat-id-123');
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

  describe('extractNotificationTitleAndBody', () => {
    it('extracts title and body from nested notification object', () => {
      const payload = {
        notification: {
          title: 'Group Chat',
          body: 'Alice: Hello everyone',
        },
        data: {
          chatId: 'chat-999',
        },
      };

      const result = extractNotificationTitleAndBody(payload);
      expect(result).toEqual({
        title: 'Group Chat',
        body: 'Alice: Hello everyone',
      });
    });

    it('extracts title and body from nested data object if notification object is absent', () => {
      const payload = {
        data: {
          title: 'Important Alert',
          message: 'Server maintenance scheduled',
          chatId: 'chat-888',
        },
      };

      const result = extractNotificationTitleAndBody(payload);
      expect(result).toEqual({
        title: 'Important Alert',
        body: 'Server maintenance scheduled',
      });
    });

    it('falls back to default title and empty body when payload is empty', () => {
      const result = extractNotificationTitleAndBody({});
      expect(result).toEqual({
        title: 'Neue Nachricht',
        body: '',
      });
    });
  });

  describe('foreground push event handling', () => {
    it('displays native system notification when receiving push message while on a different page', () => {
      renderHook(() => useNativePush());

      const event = new CustomEvent('app-webview-native-push-event', {
        detail: {
          type: 'native-push-message',
          payload: {
            notification: {
              title: 'Team Alpha',
              body: 'Bob: Check the document',
            },
            data: {
              chatId: 'chat-abc',
            },
          },
        },
      });

      act(() => {
        globalThis.dispatchEvent(event);
      });

      expect(mockNotification).toHaveBeenCalledWith('Team Alpha', {
        body: 'Bob: Check the document',
        icon: '/favicon.svg',
        data: { targetPath: '/app/chat/chat-abc' },
      });
    });

    it('suppresses native system notification when receiving push message for the currently open chat', () => {
      globalThis.history.pushState({}, '', '/de/app/chat/chat-abc');

      renderHook(() => useNativePush());

      const event = new CustomEvent('app-webview-native-push-event', {
        detail: {
          type: 'native-push-received',
          payload: {
            data: {
              title: 'Team Alpha',
              body: 'Bob: Hello again',
              chatId: 'chat-abc',
            },
          },
        },
      });

      act(() => {
        globalThis.dispatchEvent(event);
      });

      expect(mockNotification).not.toHaveBeenCalled();

      // Reset location
      globalThis.history.pushState({}, '', '/');
    });
  });

  describe('bridge recovery watchdog', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      sessionStorage.clear();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('reloads the page when the bridge stays silent after mount', () => {
      renderHook(() => useNativePush());

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('native_push_bridge_recovery_at')).not.toBeNull();
    });

    it('does not reload when a bridge event was received', () => {
      renderHook(() => useNativePush());

      act(() => {
        globalThis.dispatchEvent(
          new CustomEvent('app-webview-native-push-event', {
            detail: {
              type: 'native-push-status',
              payload: { authorizationLabel: 'authorized', hasToken: true },
            },
          }),
        );
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });

    it('does not reload again while a recent recovery attempt is recorded', () => {
      sessionStorage.setItem('native_push_bridge_recovery_at', String(Date.now()));

      renderHook(() => useNativePush());

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });

    it('does not reload when the bridge object is absent', () => {
      globalThis.AppWebViewNativePush = undefined;

      renderHook(() => useNativePush());

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });
  });
});
