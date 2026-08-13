/**
 * @jest-environment jsdom
 */

import {
  extractMessageIdentifier,
  extractNotificationTitleAndBody,
  useNativePush,
} from '@/hooks/use-native-push';
import {
  notifyForegroundMessage,
  resetForegroundNotificationState,
} from '@/utils/foreground-notifications';
import { reloadPage } from '@/utils/reload-page';
import { act, renderHook } from '@testing-library/react';

jest.mock('@/utils/reload-page', () => ({
  reloadPage: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('sonner', () => ({
  toast: (...args: unknown[]): void => {
    mockToast(...args);
  },
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

const buildDuplicateMessageEvent = (): CustomEvent =>
  new CustomEvent('app-webview-native-push-event', {
    detail: {
      type: 'native-push-message',
      payload: {
        data: {
          title: 'Team Alpha',
          body: 'Bob: Duplicated',
          chatId: 'chat-abc',
          messageId: 'message-4',
        },
      },
    },
  });

const dispatchToken = async (token: string): Promise<void> => {
  await act(async () => {
    globalThis.dispatchEvent(
      new CustomEvent('app-webview-native-push-event', {
        detail: { type: 'native-push-token', payload: { token, platform: 'android' } },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const openEvent = (url: string, bubbles: boolean): CustomEvent =>
  new CustomEvent('app-webview-native-push-event', {
    bubbles,
    detail: { type: 'native-push-open', payload: { url } },
  });

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

  /**
   * The bridge re-emits `native-push-token` several times per permission change - three
   * times in the same millisecond is normal. Every emission used to fire its own
   * `registerDevice`; batched into one request they raced over the same row server-side,
   * most of them lost, and the user was told registration had failed for a subscription
   * that was in fact stored.
   */
  describe('duplicate registration suppression', () => {
    const mockRegisterDevice = jest.fn().mockResolvedValue({ success: true });
    const mockUnregisterDevice = jest.fn().mockResolvedValue({ success: true });

    beforeEach(() => {
      mockRegisterDevice.mockClear();
      mockUnregisterDevice.mockClear();
      // A leftover pending redirect would navigate on mount and blur the count below.
      sessionStorage.removeItem('pending_push_redirect');
      localStorage.removeItem('pending_push_redirect');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const trpcMock = jest.requireMock('@/trpc/client');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      trpcMock.trpc.nativePush.registerDevice.useMutation.mockReturnValue({
        mutateAsync: mockRegisterDevice,
      });
      trpcMock.trpc.nativePush.unregisterDevice.useMutation.mockReturnValue({
        mutateAsync: mockUnregisterDevice,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    });

    it('registers a repeated token only once', async () => {
      renderHook(() => useNativePush());

      await dispatchToken('token-repeat');
      await dispatchToken('token-repeat');
      await dispatchToken('token-repeat');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });

    it('registers a new token after the previous one was deleted', async () => {
      renderHook(() => useNativePush());

      await dispatchToken('token-old');

      await act(async () => {
        globalThis.dispatchEvent(
          new CustomEvent('app-webview-native-push-event', {
            detail: {
              type: 'native-push-token-deleted',
              payload: { token: 'token-old', platform: 'android' },
            },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await dispatchToken('token-new');

      expect(mockUnregisterDevice).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    /**
     * The handler is attached to both `globalThis` and `document`, because the native
     * side is not consistent about where it dispatches. A bubbling event is then
     * delivered twice - the same Event object, handled once.
     */
    it('handles an event that bubbles from document to window only once', () => {
      renderHook(() => useNativePush());

      // Establish what a single delivery costs, then check that a bubbling one - which
      // reaches the document listener and the window listener - costs exactly the same.
      act(() => {
        globalThis.dispatchEvent(openEvent('/app/dashboard', false));
      });
      const navigationsPerDelivery = mockPush.mock.calls.length;
      mockPush.mockClear();

      act(() => {
        document.dispatchEvent(openEvent('/app/schedule', true));
      });

      expect(navigationsPerDelivery).toBeGreaterThan(0);
      expect(mockPush).toHaveBeenCalledTimes(navigationsPerDelivery);
    });
  });

  describe('extractMessageIdentifier', () => {
    it('prefers the chat message id in data over the Firebase delivery id', () => {
      // Shape produced by the native shell's normalizeRemoteMessage(): the
      // top-level messageId is Firebase's, data.messageId is the chat message.
      expect(
        extractMessageIdentifier({
          messageId: 'firebase-delivery-id',
          data: { messageId: 'chat-message-id', chatId: 'chat-abc' },
        }),
      ).toBe('chat-message-id');
    });

    it('falls back to the push log id when no chat message id is present', () => {
      expect(extractMessageIdentifier({ data: { notificationId: 'log-id' } })).toBe('log-id');
    });

    it('returns undefined when nothing identifies the message', () => {
      expect(extractMessageIdentifier({ data: { chatId: 'chat-abc' } })).toBeUndefined();
    });
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
    beforeEach(() => {
      resetForegroundNotificationState();
    });

    it('asks the native shell for a system notification while on a different page', () => {
      const showNotification = jest.fn();
      globalThis.AppWebViewNativePush = {
        getStatus: jest.fn(),
        requestPermission: jest.fn(),
        deleteToken: jest.fn(),
        openSettings: jest.fn(),
        showNotification,
      };

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
              messageId: 'message-1',
            },
          },
        },
      });

      act(() => {
        globalThis.dispatchEvent(event);
      });

      expect(showNotification).toHaveBeenCalledWith({
        title: 'Team Alpha',
        body: 'Bob: Check the document',
        url: '/app/chat/chat-abc',
        chatId: 'chat-abc',
        messageId: 'message-1',
      });
    });

    it('falls back to an in-app banner when the shell cannot show notifications', () => {
      renderHook(() => useNativePush());

      const event = new CustomEvent('app-webview-native-push-event', {
        detail: {
          type: 'native-push-message',
          payload: {
            data: {
              title: 'Team Alpha',
              body: 'Bob: Check the document',
              chatId: 'chat-abc',
              messageId: 'message-2',
            },
          },
        },
      });

      act(() => {
        globalThis.dispatchEvent(event);
      });

      expect(mockToast).toHaveBeenCalledWith(
        'Team Alpha',
        expect.objectContaining({ description: 'Bob: Check the document' }),
      );
      // The dead `new Notification(...)` path must not be used any more.
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('suppresses the notification when the targeted chat is already open', () => {
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
              messageId: 'message-3',
            },
          },
        },
      });

      act(() => {
        globalThis.dispatchEvent(event);
      });

      expect(mockToast).not.toHaveBeenCalled();

      // Reset location
      globalThis.history.pushState({}, '', '/');
    });

    it('surfaces a message only once when it arrives over both push and SSE', () => {
      renderHook(() => useNativePush());

      act(() => {
        globalThis.dispatchEvent(buildDuplicateMessageEvent());
      });

      notifyForegroundMessage({
        chatId: 'chat-abc',
        messageId: 'message-4',
        title: 'Team Alpha',
        body: 'Bob: Duplicated',
        targetPath: '/app/chat/chat-abc',
      });

      expect(mockToast).toHaveBeenCalledTimes(1);
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
