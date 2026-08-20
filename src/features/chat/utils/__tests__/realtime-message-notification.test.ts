/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import {
  extractRealtimeMessagePreview,
  notifyRealtimeChatMessage,
} from '@/features/chat/utils/realtime-message-notification';
import { resetForegroundNotificationState } from '@/utils/foreground-notifications';

const mockToast = jest.fn();
jest.mock('sonner', () => ({
  toast: (...arguments_: unknown[]): void => {
    mockToast(...arguments_);
  },
}));

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  createdAt: new Date('2026-08-08T10:00:00.000Z'),
  messagePayload: { text: 'Hello there' },
  senderId: 'user-bob',
  senderName: 'Bob',
  status: 'STORED',
  type: 'TEXT_MSG',
  ...overrides,
});

describe('notifyRealtimeChatMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetForegroundNotificationState();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.history.pushState({}, '', '/de/app/chat');
    globalThis.AppWebViewNativePush = undefined;
  });

  it('notifies with the chat name as title and "sender: text" as body', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Team Alpha',
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Team Alpha',
      expect.objectContaining({ description: 'Bob: Hello there' }),
    );
  });

  /**
   * SSE and push race for the same message and the loser is dropped by the shared
   * de-duplication window. If only the push path knew about the emergency channel,
   * whether an alert sirens would come down to which channel happened to arrive first.
   */
  it('renders a message from an emergency chat on the emergency channel', () => {
    const showNotification = jest.fn();
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      showNotification,
    };

    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Notfall 42',
      chatType: 'EMERGENCY',
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: 'emergency' }),
    );
  });

  it('leaves every other chat type on the regular channel', () => {
    const showNotification = jest.fn();
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      showNotification,
    };

    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Support',
      chatType: 'SUPPORT_GROUP',
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    const request = (showNotification.mock.calls as unknown[][])[0]?.[0] as Record<string, string>;
    expect(request['notificationType']).toBeUndefined();
  });

  it('ignores messages sent by the current user', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Team Alpha',
      message: buildMessage({ senderId: 'user-alice' }),
      currentUserId: 'user-alice',
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('ignores system messages and optimistic placeholders', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Team Alpha',
      message: buildMessage({ type: 'SYSTEM_MSG' }),
      currentUserId: 'user-alice',
    });
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Team Alpha',
      message: buildMessage({ id: 'optimistic-42' }),
      currentUserId: 'user-alice',
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('falls back to the sender name when the chat name is unknown', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: undefined,
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(mockToast).toHaveBeenCalledWith('Bob', expect.anything());
  });

  describe('extractRealtimeMessagePreview', () => {
    it('reads plain text payloads', () => {
      expect(extractRealtimeMessagePreview({ text: 'Hi' }, 'de')).toBe('Hi');
    });

    it('describes image payloads', () => {
      expect(extractRealtimeMessagePreview({ url: 'https://example.com/a.png' }, 'en')).toBe(
        '📷 Image',
      );
    });

    it('returns an empty preview for unknown payloads', () => {
      expect(extractRealtimeMessagePreview({ foo: 'bar' }, 'de')).toBe('');
    });
  });
});
