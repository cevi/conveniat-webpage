import type { ChatMessage } from '@/features/chat/api/types';
import type { SendMessageInput } from '@/features/chat/utils/failed-sends';
import { CHAT_OUTBOX_STORAGE_KEY } from '@/lib/chat-local-storage';
import { MessageEventType } from '@/lib/chat-shared';

export interface OfflineMessage {
  type: 'MESSAGE';
  id: string; // Optimistic ID
  chatId: string;
  content: string;
  // Absent in entries queued by older app versions, which only queued text. Only the types a
  // client may send: system and alert messages are created by the server alone.
  messageType?: SendMessageInput['type'];
  quotedMessageId?: string | undefined;
  parentId?: string | undefined;
  createdAt: string; // ISO String
  // Who wrote it. Absent in entries queued by older app versions: those belong to whoever
  // is logged in.
  userId?: string | undefined;
  retryCount?: number;
}

export interface OfflineChatCreation {
  type: 'CREATE_CHAT';
  // Client-generated chat id (see `generateChatId`). It is the id the chat is already
  // open under locally and the id the server is asked to store it as, so queued messages
  // for this chat need no rewriting once the creation is replayed.
  id: string;
  chatName: string | undefined;
  memberIds: string[];
  createdAt: string; // ISO String
  userId?: string | undefined;
  retryCount?: number;
}

export type OfflineOutboxItem = OfflineMessage | OfflineChatCreation;

const OFFLINE_OUTBOX_KEY = CHAT_OUTBOX_STORAGE_KEY;

/** Whether `userId` may see and send a queued item. */
export const isOutboxItemOwnedBy = (item: OfflineOutboxItem, userId: string): boolean =>
  item.userId === undefined || item.userId === userId;

// Sends whose request this page still has open. Every send is queued before its request goes
// out, so that a PWA killed mid-request keeps it; the drain leaves these alone instead of
// posting each message a second time while the first request is still on its way.
const sendsInFlight = new Set<string>();

/** Marks a queued send as being sent by this page, or releases it again. */
export const setSendInFlight = (id: string, inFlight: boolean): void => {
  if (inFlight) sendsInFlight.add(id);
  else sendsInFlight.delete(id);
};

/** Whether this page has a request open for the queued send. */
export const isSendInFlight = (id: string): boolean => sendsInFlight.has(id);

/**
 * Retrieves the current queue of offline items from localStorage.
 */
export const getOfflineOutbox = (): OfflineOutboxItem[] => {
  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<OfflineOutboxItem>[];
    return parsed.map((item) => {
      // Backwards compatibility for existing message outbox items
      if (!item.type) {
        return { ...item, type: 'MESSAGE' } as OfflineMessage;
      }
      return item as OfflineOutboxItem;
    });
  } catch (error) {
    console.error('Failed to parse offline outbox:', error);
    try {
      localStorage.removeItem(OFFLINE_OUTBOX_KEY);
    } catch {
      // Ignore localStorage errors
    }
    return [];
  }
};

/**
 * The bubble for a queued message, as it shows while it waits for the connection.
 */
export const toPendingChatMessage = (item: OfflineMessage, currentUser: string): ChatMessage => {
  const messageType = item.messageType ?? 'TEXT_MSG';
  return {
    id: item.id,
    messagePayload:
      messageType === 'IMAGE_MSG'
        ? { url: item.content }
        : {
            text: item.content.trim(),
            ...(item.quotedMessageId ? { quotedMessageId: item.quotedMessageId } : {}),
          },
    createdAt: new Date(item.createdAt),
    senderId: currentUser,
    status: MessageEventType.CREATED,
    type: messageType,
    parentId: item.parentId ?? undefined,
    isPendingOffline: true,
  };
};

/**
 * Formats the pending outbox items of `currentUser` in a given chat as ChatMessage objects
 * for UI rehydration across app restarts.
 */
export const getPendingOutboxChatMessages = (
  chatId: string,
  parentId: string | undefined,
  currentUser: string | undefined,
): ChatMessage[] => {
  // without the user we cannot tell own bubbles from others', so show none yet
  if (currentUser === undefined) return [];

  const matching = getOfflineOutbox().filter(
    (item): item is OfflineMessage =>
      item.type === 'MESSAGE' &&
      isOutboxItemOwnedBy(item, currentUser) &&
      item.chatId === chatId &&
      (parentId ? item.parentId === parentId : !item.parentId),
  );

  return matching.map((item) => toPendingChatMessage(item, currentUser));
};

/**
 * Saves a list of offline items to localStorage.
 */
export const saveOfflineOutbox = (outbox: OfflineOutboxItem[]): void => {
  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(outbox));
    globalThis.dispatchEvent(new Event('conveniat:outbox-updated'));
  } catch (error) {
    console.error('Failed to save offline outbox:', error);
  }
};

/**
 * Appends a new item to the offline outbox.
 */
export const addMessageToOutbox = (message: OfflineOutboxItem): void => {
  const outbox = getOfflineOutbox();
  // Prevent duplicate additions
  if (outbox.some((item) => item.id === message.id)) return;
  outbox.push(message);
  saveOfflineOutbox(outbox);
};

/**
 * Removes an item by its optimistic ID from the offline outbox.
 */
export const removeMessageFromOutbox = (id: string): void => {
  const outbox = getOfflineOutbox();
  const filtered = outbox.filter((item) => item.id !== id);
  saveOfflineOutbox(filtered);
};
