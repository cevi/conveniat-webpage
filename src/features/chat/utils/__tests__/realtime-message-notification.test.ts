/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import {
  extractRealtimeMessagePreview,
  notifyRealtimeChatMessage,
} from '@/features/chat/utils/realtime-message-notification';
import { resetForegroundNotificationState } from '@/utils/foreground-notifications';

const showNotification = jest.fn();

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
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
      showNotification,
    };
  });

  it('notifies with the chat name as title and "sender: text" as body', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Team Alpha',
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Team Alpha', body: 'Bob: Hello there' }),
    );
  });

  it('hands the Android app the message apart from its sender, as the push does', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Bob',
      isGroupChat: false,
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ senderName: 'Bob', text: 'Hello there', isGroup: false }),
    );
  });

  /**
   * Only the alert that opens an emergency chat sirens, and it arrives by push. A reply
   * in a busy emergency chat must not sound like a new emergency (#1654).
   */
  it('rings an emergency chat reply on the regular channel', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Notfall 42',
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

    expect(showNotification).not.toHaveBeenCalled();
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

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('falls back to the sender name when the chat name is unknown', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: undefined,
      message: buildMessage(),
      currentUserId: 'user-alice',
    });

    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bob' }));
  });

  it('says who sent an image, in the same words as the push', () => {
    notifyRealtimeChatMessage({
      chatId: 'chat-1',
      chatName: 'Cevi Uster',
      message: buildMessage({
        type: 'IMAGE_MSG',
        messagePayload: { url: 'chat-images/chat-1/1719830400000-k3j9x2.jpg' },
      }),
      currentUserId: 'user-alice',
    });

    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cevi Uster', body: 'Bob hat ein Bild gesendet' }),
    );
  });

  describe('extractRealtimeMessagePreview', () => {
    it('reads plain text payloads', () => {
      expect(extractRealtimeMessagePreview({ text: 'Hi' })).toBe('Hi');
    });

    it('returns an empty preview for unknown payloads', () => {
      expect(extractRealtimeMessagePreview({ foo: 'bar' })).toBe('');
    });
  });
});
