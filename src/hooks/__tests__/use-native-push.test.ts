/**
 * @jest-environment jsdom
 */

import {
  extractMessageIdentifier,
  extractNotificationLogId,
  extractNotificationTitleAndBody,
  extractNotificationType,
  useNativePush,
} from '@/hooks/use-native-push';
import { writePreference } from '@/lib/preferences';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { assignLocation } from '@/utils/assign-location';
import {
  notifyForegroundMessage,
  resetForegroundNotificationState,
} from '@/utils/foreground-notifications';
import { reloadPage } from '@/utils/reload-page';
import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/utils/reload-page', () => ({
  reloadPage: jest.fn(),
}));

jest.mock('@/utils/assign-location', () => ({
  assignLocation: jest.fn(),
}));

const mockPush = jest.fn();
const mockNotification = jest.fn();
const mockMarkInteracted = jest.fn();
const mockMarkDelivered = jest.fn();
const mockPostHogCapture = jest.fn();

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]): unknown => mockPostHogCapture(...args) },
}));

beforeAll(() => {
  // @ts-expect-error Mocking global Notification constructor
  globalThis.Notification = jest.fn().mockImplementation((title, options) => {
    mockNotification(title, options);
    return { addEventListener: jest.fn() };
  });
  // @ts-expect-error Mocking Notification permission
  globalThis.Notification.permission = 'granted';
});

// The real router keeps its identity across renders, and the hook's listeners rely on it.
const mockRouter = { push: mockPush };
jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => mockRouter,
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const mockRegisterDevice = jest.fn();
const mockUnregisterDevice = jest.fn();

/** The server side of the four procedures the hook calls. */
const createServer = (): TestTrpc =>
  createTestTrpc({
    'nativePush.registerDevice': mockRegisterDevice,
    'nativePush.unregisterDevice': mockUnregisterDevice,
    'pushTracking.markInteracted': mockMarkInteracted,
    'pushTracking.markDelivered': mockMarkDelivered,
  });

let server: TestTrpc;

const renderNativePush = (): RenderHookResult<ReturnType<typeof useNativePush>, unknown> =>
  renderHook(() => useNativePush(), { wrapper: server.wrapper });

/** Lets a mutation the last event started reach the server. */
const flushCalls = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

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
    mockRegisterDevice.mockReset().mockResolvedValue({ success: true });
    mockUnregisterDevice.mockReset().mockResolvedValue({ success: true });
    server = createServer();
    writePreference('native-push-opted-out', false);
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
    renderNativePush();

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

  it('records a tap on a native notification against its push log entry', async () => {
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-open',
            payload: {
              messageId: 'fcm-delivery-id',
              data: { url: '/app/dashboard', notificationId: 'log-123' },
            },
          },
        }),
      );
    });

    await flushCalls();
    expect(mockMarkInteracted).toHaveBeenCalledWith({ id: 'log-123', type: 'CLICK' });
  });

  it('records a tap on a native notification in PostHog', async () => {
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(openEvent('/app/chat/123', false));
    });

    await waitFor(() =>
      expect(mockPostHogCapture).toHaveBeenCalledWith('push_notification_opened', {
        channel: 'native',
        notification_type: 'default',
        target: 'chat',
      }),
    );
  });

  /**
   * In the foreground the WebView is the only code that sees a native push arrive; in the
   * background the OS renders it without running any. This is the one receipt the server
   * gets for a native push.
   */
  it('reports a native push received in the foreground as delivered', async () => {
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-message',
            payload: {
              messageId: 'fcm-delivery-id',
              notification: { title: 'Cevi Uster', body: 'Mia: Treffpunkt beim Tor' },
              data: { chatId: 'chat-abc', messageId: 'message-1', notificationId: 'log-456' },
            },
          },
        }),
      );
    });

    await flushCalls();
    expect(mockMarkDelivered).toHaveBeenCalledWith({ id: 'log-456' });
  });

  it('records nothing when a native notification carries no push log id', async () => {
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(openEvent('/app/chat/123', false));
    });

    await flushCalls();
    expect(mockMarkInteracted).not.toHaveBeenCalled();
  });

  it('parses absolute URL and navigates to target path on native-push-open event', () => {
    renderNativePush();

    const event = new CustomEvent('app-webview-native-push-event', {
      detail: {
        type: 'native-push-open',
        payload: {
          url: `${globalThis.location.origin}/app/chat/550e8400-e29b-41d4-a716-446655440000`,
        },
      },
    });

    act(() => {
      globalThis.dispatchEvent(event);
    });

    expect(mockPush).toHaveBeenCalledWith('/app/chat/550e8400-e29b-41d4-a716-446655440000');
  });

  it('opens a link to another origin, like the short domain, as a full navigation', () => {
    sessionStorage.clear();
    localStorage.clear();
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(openEvent('https://con27.ch/agbs', false));
    });

    expect(assignLocation).toHaveBeenCalledWith('https://con27.ch/agbs');
    expect(mockPush).not.toHaveBeenCalled();
    expect(localStorage.getItem('pending_push_redirect')).toBeNull();
  });

  it('falls back to /app/dashboard for a URL that is not http(s)', () => {
    renderNativePush();

    act(() => {
      globalThis.dispatchEvent(openEvent('javascript:alert(1)', false));
    });

    expect(mockPush).toHaveBeenCalledWith('/app/dashboard');
    // The mocked router never arrives, so the page loads the dashboard, never the script.
    expect(assignLocation).toHaveBeenCalledWith('/app/dashboard');
    expect(assignLocation).not.toHaveBeenCalledWith(expect.stringContaining('javascript'));
  });

  it('prioritizes chatId over generic fallback dashboard url', () => {
    renderNativePush();

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
    renderNativePush();

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
    mockRegisterDevice.mockRejectedValue(new Error('User not authenticated'));

    const { result } = renderNativePush();

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
    beforeEach(() => {
      // A leftover pending redirect would navigate on mount and blur the count below.
      sessionStorage.removeItem('pending_push_redirect');
      localStorage.removeItem('pending_push_redirect');
    });

    it('registers a repeated token only once', async () => {
      renderNativePush();

      await dispatchToken('token-repeat');
      await dispatchToken('token-repeat');
      await dispatchToken('token-repeat');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });

    it('registers a new token after the previous one was deleted', async () => {
      renderNativePush();

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
     * The token can rotate while a registration for the previous one is still open.
     * The in-flight marker holds a single token, so the older call settling must not
     * release the marker the newer call is relying on - otherwise a repeat emission
     * of the newer token starts a second registration for a request still in flight,
     * which is the duplication this whole guard exists to prevent.
     */
    it('keeps a newer token in flight when an overlapping older registration settles', async () => {
      const pendingRegistrations = new Map<string, (value: unknown) => void>();
      mockRegisterDevice.mockImplementation(
        async ({ token }: { token: string }) =>
          new Promise((resolve) => pendingRegistrations.set(token, resolve)),
      );

      renderNativePush();

      // Neither call resolves, so both are open at the same time.
      await dispatchToken('token-a');
      await dispatchToken('token-b');
      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);

      // The older one wins the race back.
      await act(async () => {
        pendingRegistrations.get('token-a')?.({ success: true });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await dispatchToken('token-b');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    /**
     * The handler is attached to both `globalThis` and `document`, because the native
     * side is not consistent about where it dispatches. A bubbling event is then
     * delivered twice - the same Event object, handled once.
     */
    it('handles an event that bubbles from document to window only once', () => {
      renderNativePush();

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

  /**
   * The native shell has Firebase issue a new token right after deleting one, and reports
   * a token on every resume. Registering whatever token turned up switched push straight
   * back on, and sent another "successfully subscribed" push with it.
   */
  describe('turning push off', () => {
    beforeEach(() => {
      sessionStorage.removeItem('pending_push_redirect');
      localStorage.removeItem('pending_push_redirect');
    });

    it('does not register the new token the shell reports after the delete', async () => {
      const { result } = renderNativePush();
      await dispatchToken('token-before');

      act(() => {
        result.current.deleteToken();
      });
      await act(async () => {
        globalThis.dispatchEvent(
          new CustomEvent('app-webview-native-push-event', {
            detail: {
              type: 'native-push-token-deleted',
              payload: { token: 'token-before', platform: 'android' },
            },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await dispatchToken('token-after');

      expect(globalThis.AppWebViewNativePush?.deleteToken).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).not.toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-after' }),
      );
      expect(result.current.isOptedOut).toBe(true);
    });

    it('stays off on the next launch and removes a token the backend still holds once', async () => {
      writePreference('native-push-opted-out', true);
      const { result } = renderNativePush();

      await dispatchToken('token-on-launch');
      await dispatchToken('token-on-launch');

      expect(mockRegisterDevice).not.toHaveBeenCalled();
      expect(mockUnregisterDevice).toHaveBeenCalledTimes(1);
      expect(mockUnregisterDevice).toHaveBeenCalledWith({
        token: 'token-on-launch',
        platform: 'android',
      });
      expect(result.current.isOptedOut).toBe(true);
    });

    it('registers the token again once the user turns push back on', async () => {
      writePreference('native-push-opted-out', true);
      const { result } = renderNativePush();

      act(() => {
        result.current.requestPermission();
      });
      await dispatchToken('token-reenabled');

      expect(mockRegisterDevice).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-reenabled', platform: 'android' }),
      );
      expect(result.current.isOptedOut).toBe(false);
    });
  });

  describe('extractNotificationLogId', () => {
    it('ignores the chat message id and returns the push log id', () => {
      expect(
        extractNotificationLogId({ data: { messageId: 'message-1', notificationId: 'log-1' } }),
      ).toBe('log-1');
    });

    it('returns undefined without a push log id', () => {
      expect(extractNotificationLogId({ data: { messageId: 'message-1' } })).toBeUndefined();
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

  describe('extractNotificationType', () => {
    it('finds the emergency type in the FCM data payload', () => {
      expect(
        extractNotificationType({
          messageId: 'firebase-delivery-id',
          data: { notificationType: 'emergency', chatId: 'chat-abc' },
        }),
      ).toBe('emergency');
    });

    // iOS delivers the same field under userInfo rather than data.
    it('finds it in the iOS userInfo payload', () => {
      expect(extractNotificationType({ userInfo: { notificationType: 'emergency' } })).toBe(
        'emergency',
      );
    });

    it('treats a missing or unknown type as a regular chat notification', () => {
      expect(extractNotificationType({ data: { chatId: 'chat-abc' } })).toBe('default');
      expect(extractNotificationType({ data: { notificationType: 'something-else' } })).toBe(
        'default',
      );
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
    const showNotification = jest.fn();

    beforeEach(() => {
      resetForegroundNotificationState();
      showNotification.mockClear();
      globalThis.AppWebViewNativePush = {
        getStatus: jest.fn(),
        requestPermission: jest.fn(),
        deleteToken: jest.fn(),
        openSettings: jest.fn(),
        showNotification,
      };
    });

    it('asks the native shell for a system notification while on a different page', () => {
      renderNativePush();

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

    it('shows nothing of its own when the shell cannot show notifications', () => {
      globalThis.AppWebViewNativePush = {
        getStatus: jest.fn(),
        requestPermission: jest.fn(),
        deleteToken: jest.fn(),
        openSettings: jest.fn(),
      };
      renderNativePush();

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

      expect(showNotification).not.toHaveBeenCalled();
      // The dead `new Notification(...)` path must not be used any more.
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('suppresses the notification when the targeted chat is already open', () => {
      globalThis.history.pushState({}, '', '/de/app/chat/chat-abc');

      renderNativePush();

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

      expect(showNotification).not.toHaveBeenCalled();

      // Reset location
      globalThis.history.pushState({}, '', '/');
    });

    it('surfaces a message only once when it arrives over both push and SSE', () => {
      renderNativePush();

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

      expect(showNotification).toHaveBeenCalledTimes(1);
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
      renderNativePush();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('native_push_bridge_recovery_at')).not.toBeNull();
    });

    it('does not reload when a bridge event was received', () => {
      renderNativePush();

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

      renderNativePush();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });

    it('does not reload when the bridge object is absent', () => {
      globalThis.AppWebViewNativePush = undefined;

      renderNativePush();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });
  });
});
