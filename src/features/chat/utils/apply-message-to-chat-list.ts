import type { ChatMessage } from '@/features/chat/api/types';
import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';

/**
 * Applies a message that arrived over the realtime stream to the cached chat list: it becomes
 * the chat's last message, the chat moves to the top, and a message from someone else counts
 * as unread, the way `getChatList` would answer after a refetch.
 *
 * Refetching the list for every message made each announcement cost one list query per online
 * member. Applying the same message twice is a no-op, since every mounted chat screen hears the
 * event. Opening the chat clears the count again through `useMessageReadStatus`.
 *
 * @param chats - the cached list, possibly persisted by an older version of the app
 * @param chatId - the chat the message landed in
 * @param message - the message from the realtime event
 * @param currentUserId - uuid of the signed-in user
 * @returns the patched list, or `undefined` when the chat is not in the list and only a refetch
 *   can add it
 */
export const applyMessageToChatList = (
  chats: ChatWithMessagePreview[],
  chatId: string,
  message: ChatMessage,
  currentUserId: string,
): ChatWithMessagePreview[] | undefined => {
  const chat = chats.find((item) => item.id === chatId);
  if (chat === undefined) return undefined;
  if (chat.lastMessage?.id === message.id) return chats;

  // the same rule as the unread count on the server
  const isUnread = message.type === 'SYSTEM_MSG' || message.senderId !== currentUserId;
  // a list restored from before `unreadCount` was always set must not turn into NaN
  const previousUnreadCount = Number.isFinite(chat.unreadCount) ? chat.unreadCount : 0;
  let unreadCount = previousUnreadCount;
  if (isUnread) unreadCount = chat.isLarge === true ? 1 : previousUnreadCount + 1;

  const patchedChat: ChatWithMessagePreview = {
    ...chat,
    lastMessage: {
      id: message.id,
      senderId: message.senderId ?? SYSTEM_SENDER_ID,
      ...(message.senderName === undefined ? {} : { senderName: message.senderName }),
      messagePreview: getMessagePreviewText({
        contentVersions: [{ payload: message.messagePayload }],
      }),
      createdAt: message.createdAt,
      status: message.status,
    },
    lastUpdate: message.createdAt,
    unreadCount,
    messageCount: (Number.isFinite(chat.messageCount) ? chat.messageCount : 0) + 1,
  };

  return [patchedChat, ...chats.filter((item) => item.id !== chatId)];
};
