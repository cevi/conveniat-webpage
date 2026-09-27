/**
 * localStorage keys of chat text that has not reached the server yet. They live here rather
 * than in the chat feature because logging out has to clear them, and logout happens in
 * places (settings, Hof dashboard, admin panel) that cannot import the chat feature.
 */
export const CHAT_OUTBOX_STORAGE_KEY = 'conveniat-offline-outbox';
export const CHAT_FAILED_SENDS_STORAGE_KEY = 'conveniat-failed-sends';
export const CHAT_DRAFT_STORAGE_KEY_PREFIX = 'conveniat:chat-draft:';

/**
 * Drops queued sends, failed sends and composer drafts, so the next person to log in on a
 * shared phone neither reads them nor sends them under their own name.
 */
export const clearUnsentChatData = (): void => {
  try {
    localStorage.removeItem(CHAT_OUTBOX_STORAGE_KEY);
    localStorage.removeItem(CHAT_FAILED_SENDS_STORAGE_KEY);
    const draftKeys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => key?.startsWith(CHAT_DRAFT_STORAGE_KEY_PREFIX) === true);
    for (const key of draftKeys) localStorage.removeItem(key);
  } catch {
    // storage blocked: there is nothing we can reach to clear
  }
};
