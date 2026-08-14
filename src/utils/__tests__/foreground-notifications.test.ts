/**
 * @jest-environment jsdom
 */

import {
  isNotificationTargetVisible,
  notifyForegroundMessage,
  resetForegroundNotificationState,
  setForegroundNotificationNavigator,
} from '@/utils/foreground-notifications';

const mockToast = jest.fn();
jest.mock('sonner', () => ({
  toast: (...arguments_: unknown[]): void => {
    mockToast(...arguments_);
  },
}));

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
};

describe('foreground notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetForegroundNotificationState();
    setUserAgent('KonektaApp/1.0');
    globalThis.history.pushState({}, '', '/de/app/dashboard');
    globalThis.AppWebViewNativePush = undefined;
  });

  const baseNotification = {
    chatId: 'chat-1',
    messageId: 'message-1',
    title: 'Team Alpha',
    body: 'Bob: Hi there',
    targetPath: '/app/chat/chat-1',
  };

  it('prefers the native shell when it can render system notifications', () => {
    const showNotification = jest.fn();
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      showNotification,
    };

    notifyForegroundMessage(baseNotification);

    expect(showNotification).toHaveBeenCalledWith({
      title: 'Team Alpha',
      body: 'Bob: Hi there',
      url: '/app/chat/chat-1',
      chatId: 'chat-1',
      messageId: 'message-1',
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('forwards notificationType="emergency" to the native shell (issue #47)', () => {
    const showNotification = jest.fn();
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      showNotification,
    };

    notifyForegroundMessage({ ...baseNotification, notificationType: 'emergency' });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: 'emergency' }),
    );
  });

  it('falls back to the in-app banner on app builds without showNotification', () => {
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    notifyForegroundMessage(baseNotification);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the native app, where the service worker already decides', () => {
    setUserAgent('Mozilla/5.0');

    notifyForegroundMessage(baseNotification);

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('suppresses the notification while the targeted chat is on screen', () => {
    globalThis.history.pushState({}, '', '/de/app/chat/chat-1');

    notifyForegroundMessage(baseNotification);

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('still notifies while a different chat is on screen', () => {
    globalThis.history.pushState({}, '', '/de/app/chat/chat-2');

    notifyForegroundMessage(baseNotification);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('surfaces a message only once when both delivery channels report it', () => {
    notifyForegroundMessage(baseNotification);
    notifyForegroundMessage({ ...baseNotification, title: 'Team Alpha (retry)' });

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('treats notifications without a message id as distinct per body', () => {
    notifyForegroundMessage({ ...baseNotification, messageId: undefined });
    notifyForegroundMessage({ ...baseNotification, messageId: undefined, body: 'Bob: Second' });

    expect(mockToast).toHaveBeenCalledTimes(2);
  });

  it('routes through the registered client-side navigator when opened', () => {
    const navigate = jest.fn();
    setForegroundNotificationNavigator(navigate);

    notifyForegroundMessage(baseNotification);

    const [, toastOptions] = mockToast.mock.calls[0] as [
      string,
      { action: { onClick: () => void } },
    ];
    toastOptions.action.onClick();

    expect(navigate).toHaveBeenCalledWith('/app/chat/chat-1');
  });

  describe('isNotificationTargetVisible', () => {
    it('matches a chat across locale and design prefixes', () => {
      globalThis.history.pushState({}, '', '/fr/app/chat/chat-1/details');
      expect(isNotificationTargetVisible('chat-1', '/app/chat/chat-1')).toBe(true);
    });

    it('matches non-chat targets by path suffix', () => {
      globalThis.history.pushState({}, '', '/de/app/dashboard');
      expect(isNotificationTargetVisible(undefined, '/app/dashboard')).toBe(true);
      expect(isNotificationTargetVisible(undefined, '/app/schedule')).toBe(false);
    });
  });
});
