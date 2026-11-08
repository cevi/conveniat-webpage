/**
 * @jest-environment jsdom
 */

import { closeAllNotifications, closeChatNotifications } from '@/utils/close-notifications';

const closeNotifications = jest.fn();
const closeAllNativeNotifications = jest.fn();

const shownNotification = (tag: string): { tag: string; close: jest.Mock } => ({
  tag,
  close: jest.fn(),
});

const installServiceWorker = (notifications: { tag: string; close: jest.Mock }[]): void => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: jest.fn(() =>
        Promise.resolve({ getNotifications: jest.fn(() => Promise.resolve(notifications)) }),
      ),
    },
  });
};

describe('closing notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      closeNotifications,
      closeAllNotifications: closeAllNativeNotifications,
    };
  });

  afterEach(() => {
    globalThis.AppWebViewNativePush = undefined;
  });

  it('closes a read chat in the native app by its tag and its emergencies by prefix', async () => {
    installServiceWorker([]);

    await closeChatNotifications('chat-1');

    expect(closeNotifications).toHaveBeenCalledWith({
      tags: ['chat:chat-1'],
      tagPrefixes: ['emergency:chat-1:'],
    });
  });

  it('closes only the read chat in the browser', async () => {
    const chat = shownNotification('chat:chat-1');
    const emergency = shownNotification('emergency:chat-1:message-1');
    const otherChat = shownNotification('chat:chat-2');
    installServiceWorker([chat, emergency, otherChat]);

    await closeChatNotifications('chat-1');

    expect(chat.close).toHaveBeenCalled();
    expect(emergency.close).toHaveBeenCalled();
    expect(otherChat.close).not.toHaveBeenCalled();
  });

  it('leaves an app build without the command alone', async () => {
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };
    installServiceWorker([]);

    await expect(closeChatNotifications('chat-1')).resolves.toBeUndefined();
  });

  it('closes everything on logout, in the app and in the browser', async () => {
    const chat = shownNotification('chat:chat-1');
    const announcement = shownNotification('announcement:message-1');
    installServiceWorker([chat, announcement]);

    await closeAllNotifications();

    expect(closeAllNativeNotifications).toHaveBeenCalledTimes(1);
    expect(chat.close).toHaveBeenCalled();
    expect(announcement.close).toHaveBeenCalled();
  });
});
