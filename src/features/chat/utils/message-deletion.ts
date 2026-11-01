import type { ChatMessage } from '@/features/chat/api/types';
import { deletedMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';

/**
 * Whether the sender deleted the message. Read defensively: a message restored from a cache
 * persisted before deleting existed has no `deletedAt`, and one from the realtime stream
 * carries it as a string.
 */
export const isMessageDeleted = (
  message: { deletedAt?: Date | string | null | undefined } | undefined,
): boolean => {
  const deletedAt = message?.deletedAt;
  if (deletedAt === undefined || deletedAt === null) return false;
  return !Number.isNaN(new Date(deletedAt).getTime());
};

/** The message as the server answers once it is deleted: no content, no reactions. */
export const asDeletedMessage = (message: ChatMessage, deletedAt: Date): ChatMessage => ({
  ...message,
  messagePayload: {},
  reactions: [],
  deletedAt,
});

/** The payload as an object, or undefined; a restored cache may hold anything there. */
const payloadObjectOf = (message: ChatMessage): Record<string, unknown> | undefined => {
  const payload: unknown = message.messagePayload;
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  return payload as Record<string, unknown>;
};

const quotesMessage = (message: ChatMessage, messageId: string): boolean =>
  payloadObjectOf(message)?.['quotedMessageId'] === messageId;

/** The quote of a deleted message, without the line of it that it carried. */
const withoutQuotedSnippet = (message: ChatMessage): ChatMessage => {
  const payload = payloadObjectOf(message);
  if (payload === undefined) return message;
  return {
    ...message,
    messagePayload: Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== 'quotedSnippet'),
    ) as ChatMessage['messagePayload'],
    quotedMessageDeleted: true,
  };
};

/**
 * Applies a deletion to a list of messages: the message turns into its deleted form, and the
 * quotes of it lose their snippet. Returns the same array when nothing in it changed.
 */
export const applyDeletionToMessages = (
  messages: ChatMessage[],
  messageId: string,
  deletedAt: Date,
): ChatMessage[] => {
  const patched = messages.map((message) => {
    if (message.id === messageId) return asDeletedMessage(message, deletedAt);
    if (quotesMessage(message, messageId) && message.quotedMessageDeleted !== true) {
      return withoutQuotedSnippet(message);
    }
    return message;
  });
  return patched.some((message, index) => message !== messages[index]) ? patched : messages;
};

/**
 * Applies a deletion to the cached chat list: a chat whose last message it was previews
 * "Nachricht gelöscht", as `getChatList` answers after a refetch. Returns the same array when
 * the message is not the last one of its chat.
 */
export const applyDeletionToChatList = (
  chats: ChatWithMessagePreview[],
  chatId: string,
  messageId: string,
): ChatWithMessagePreview[] => {
  const chat = chats.find((item) => item.id === chatId);
  if (chat?.lastMessage?.id !== messageId) return chats;
  return chats.map((item) =>
    item.id === chatId && item.lastMessage !== undefined
      ? { ...item, lastMessage: { ...item.lastMessage, messagePreview: deletedMessagePreviewText } }
      : item,
  );
};
