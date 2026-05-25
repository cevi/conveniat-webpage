export interface OfflineMessage {
  id: string; // Optimistic ID
  chatId: string;
  content: string;
  quotedMessageId?: string | undefined;
  parentId?: string | undefined;
  createdAt: string; // ISO String
}

const OFFLINE_OUTBOX_KEY = 'conveniat-offline-outbox';

/**
 * Retrieves the current queue of offline messages from localStorage.
 */
export const getOfflineOutbox = (): OfflineMessage[] => {
  // eslint-disable-next-line unicorn/prefer-global-this, unicorn/no-typeof-undefined
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMessage[];
  } catch (error) {
    console.error('Failed to parse offline outbox:', error);
    return [];
  }
};

/**
 * Saves a list of offline messages to localStorage.
 */
const saveOfflineOutbox = (outbox: OfflineMessage[]): void => {
  // eslint-disable-next-line unicorn/prefer-global-this, unicorn/no-typeof-undefined
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(outbox));
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
