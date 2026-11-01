import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import {
  applyDeletionToChatList,
  applyDeletionToMessages,
  isMessageDeleted,
} from '@/features/chat/utils/message-deletion';

const message = (id: string, payload: ChatMessage['messagePayload']): ChatMessage => ({
  id,
  createdAt: new Date(Date.UTC(2027, 6, 25, 8, 0)),
  messagePayload: payload,
  senderId: 'ben',
  status: 'STORED',
  type: 'TEXT_MSG',
  reactions: [{ emoji: '👍', userId: 'anna', userName: 'Anna Muster' }],
});

const deletedAt = new Date(Date.UTC(2027, 6, 25, 9, 0));

describe('isMessageDeleted', () => {
  it('reads a message from an old cache, without the field, as standing', () => {
    expect(isMessageDeleted(message('a', { text: 'Hoi' }))).toBe(false);
    expect(isMessageDeleted({})).toBe(false);
  });

  it('reads the time from the stream, a string, as deleted', () => {
    expect(isMessageDeleted({ deletedAt: '2027-07-25T09:00:00.000Z' })).toBe(true);
    expect(isMessageDeleted({ deletedAt: 'garbage' })).toBe(false);
  });
});

describe('applyDeletionToMessages', () => {
  it('takes the content and the reactions of the message, and the snippet from quotes of it', () => {
    const messages = [
      message('a', { text: 'Das Passwort ist 1234' }),
      message('b', {
        text: 'Lösch das',
        quotedMessageId: 'a',
        quotedSnippet: 'Das Passwort ist 1234',
      }),
      message('c', { text: 'Hoi' }),
    ];

    const [deleted, quote, other] = applyDeletionToMessages(messages, 'a', deletedAt);

    expect(deleted).toMatchObject({ id: 'a', messagePayload: {}, reactions: [], deletedAt });
    expect(quote?.messagePayload).toEqual({ text: 'Lösch das', quotedMessageId: 'a' });
    expect(quote?.quotedMessageDeleted).toBe(true);
    expect(other).toBe(messages[2]);
  });

  it('hands back the same list when the message is not in it', () => {
    const messages = [message('c', { text: 'Hoi' })];
    expect(applyDeletionToMessages(messages, 'a', deletedAt)).toBe(messages);
  });
});

const chat = (id: string, lastMessageId: string): ChatWithMessagePreview =>
  ({
    id,
    lastMessage: { id: lastMessageId, senderId: 'ben', messagePreview: 'Das Passwort ist 1234' },
  }) as unknown as ChatWithMessagePreview;

describe('applyDeletionToChatList', () => {
  it('previews "Nachricht gelöscht" in the chat whose last message it was', () => {
    const [patched] = applyDeletionToChatList([chat('chat-1', 'a')], 'chat-1', 'a');
    expect(patched?.lastMessage?.messagePreview).toEqual({
      de: 'Nachricht gelöscht',
      en: 'Message deleted',
      fr: 'Message supprimé',
    });
  });

  it('leaves the list alone when an older message was deleted', () => {
    const chats = [chat('chat-1', 'b')];
    expect(applyDeletionToChatList(chats, 'chat-1', 'a')).toBe(chats);
  });
});
