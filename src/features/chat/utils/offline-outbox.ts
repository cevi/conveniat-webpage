import type { ChatMessage } from '@/features/chat/api/types';

export interface OfflineMessage {
  type: 'MESSAGE';
  id: string; // Optimistic ID
  chatId: string;
  content: string;
  quotedMessageId?: string | undefined;
  parentId?: string | undefined;
  createdAt: string; // ISO String
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
  retryCount?: number;
}

export type OfflineOutboxItem = OfflineMessage | OfflineChatCreation;

const OFFLINE_OUTBOX_KEY = 'conveniat-offline-outbox';

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
 * Formats pending outbox items for a given chat as ChatMessage objects for UI rehydration across app restarts.
 */
export const getPendingOutboxChatMessages = (chatId: string, parentId?: string): ChatMessage[] => {
  const outbox = getOfflineOutbox();
  const matching = outbox.filter(
    (item) =>
      item.type === 'MESSAGE' &&
      item.chatId === chatId &&
      (parentId ? item.parentId === parentId : !item.parentId),
  ) as OfflineMessage[];

  const userId =
    // eslint-disable-next-line unicorn/prefer-global-this
    (typeof window !== 'undefined' && localStorage.getItem('conveniat-user-id')) || 'offline-user';

  return matching.map((item) => ({
    id: item.id,
    messagePayload: {
      text: item.content.trim(),
      ...(item.quotedMessageId ? { quotedMessageId: item.quotedMessageId } : {}),
    },
    createdAt: new Date(item.createdAt),
    senderId: userId,
    status: 'CREATED',
    type: 'TEXT_MSG',
    parentId: item.parentId ?? undefined,
    isPendingOffline: true,
  }));
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
