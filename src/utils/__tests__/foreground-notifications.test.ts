/**
 * @jest-environment jsdom
 */

import {
  isNotificationTargetVisible,
  notifyForegroundMessage,
  resetForegroundNotificationState,
} from '@/utils/foreground-notifications';

const showNotification = jest.fn();

/** A native shell from before `showNotification` existed. */
const legacyBridge = {
  getStatus: jest.fn(),
  requestPermission: jest.fn(),
  deleteToken: jest.fn(),
  openSettings: jest.fn(),
};

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
};

describe('foreground notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetForegroundNotificationState();
    setUserAgent('KonektaApp/1.0');
    globalThis.history.pushState({}, '', '/de/app/dashboard');
    globalThis.AppWebViewNativePush = { ...legacyBridge, showNotification };
  });

  const baseNotification = {
    chatId: 'chat-1',
    messageId: 'message-1',
    title: 'Team Alpha',
    body: 'Bob: Hi there',
    targetPath: '/app/chat/chat-1',
  };

  it('hands the message to the native shell as a system notification', () => {
    notifyForegroundMessage(baseNotification);

    expect(showNotification).toHaveBeenCalledWith({
      title: 'Team Alpha',
      body: 'Bob: Hi there',
      url: '/app/chat/chat-1',
      chatId: 'chat-1',
      messageId: 'message-1',
    });
  });

  /**
   * Firebase never renders a foreground message, so the channel the server named on
   * the push is not consulted. The shell reads `notificationType` from the bridge call
   * instead — without it an emergency alert arriving while the app is open would play
   * the regular chat sound.
   */
  it('asks the shell for the emergency channel when the message is an alert', () => {
    notifyForegroundMessage({ ...baseNotification, notificationType: 'emergency' });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: 'emergency' }),
    );
  });

  it('leaves the type off a regular message, which the shell reads as the chat channel', () => {
    notifyForegroundMessage({ ...baseNotification, notificationType: 'default' });

    const request = (showNotification.mock.calls as unknown[][])[0]?.[0] as Record<string, string>;
    expect(request['notificationType']).toBeUndefined();
  });

  it('shows nothing of its own on app builds without showNotification', () => {
    globalThis.AppWebViewNativePush = legacyBridge;

    expect(() => {
      notifyForegroundMessage(baseNotification);
    }).not.toThrow();
  });

  it('does nothing outside the native app, where the service worker already decides', () => {
    setUserAgent('Mozilla/5.0');

    notifyForegroundMessage(baseNotification);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('suppresses the notification while the targeted chat is on screen', () => {
    globalThis.history.pushState({}, '', '/de/app/chat/chat-1');

    notifyForegroundMessage(baseNotification);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('still notifies while a different chat is on screen', () => {
    globalThis.history.pushState({}, '', '/de/app/chat/chat-2');

    notifyForegroundMessage(baseNotification);

    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('surfaces a message only once when both delivery channels report it', () => {
    notifyForegroundMessage(baseNotification);
    notifyForegroundMessage({ ...baseNotification, title: 'Team Alpha (retry)' });

    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('treats notifications without a message id as distinct per body', () => {
    notifyForegroundMessage({ ...baseNotification, messageId: undefined });
    notifyForegroundMessage({ ...baseNotification, messageId: undefined, body: 'Bob: Second' });

    expect(showNotification).toHaveBeenCalledTimes(2);
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
