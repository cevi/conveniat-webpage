import type { ChatMessage } from '@/features/chat/api/types';

export interface OfflineMessage {
  id: string; // Optimistic ID
  chatId: string;
  content: string;
  quotedMessageId?: string | undefined;
  parentId?: string | undefined;
  createdAt: string; // ISO String
  retryCount?: number;
}

const OFFLINE_OUTBOX_KEY = 'conveniat-offline-outbox';

/**
 * Retrieves the current queue of offline messages from localStorage.
 */
export const getOfflineOutbox = (): OfflineMessage[] => {
  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMessage[];
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
    (item) => item.chatId === chatId && (parentId ? item.parentId === parentId : !item.parentId),
  );

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
 * Saves a list of offline messages to localStorage.
 */
const saveOfflineOutbox = (outbox: OfflineMessage[]): void => {
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
 * Appends a new message to the offline outbox.
 */
export const addMessageToOutbox = (message: OfflineMessage): void => {
  const outbox = getOfflineOutbox();
  // Prevent duplicate additions
  if (outbox.some((item) => item.id === message.id)) return;
  outbox.push(message);
  saveOfflineOutbox(outbox);
};

/**
 * Removes a message by its optimistic ID from the offline outbox.
 */
export const removeMessageFromOutbox = (id: string): void => {
  const outbox = getOfflineOutbox();
  const filtered = outbox.filter((item) => item.id !== id);
  saveOfflineOutbox(filtered);
};
