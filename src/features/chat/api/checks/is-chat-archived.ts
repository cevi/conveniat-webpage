/**
 * Checks if a chat is archived.
 *
 * @param chat
 */
export const isChatArchived = (chat: { archivedAt: Date | null }): boolean => {
  return chat.archivedAt !== null && chat.archivedAt <= new Date();
};
