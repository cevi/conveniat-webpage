/**
 * Checks if a chat is archived.
 *
 * @param chat
 */
export const isChatArchived = (chat: { isArchived: boolean }): boolean => {
  return chat.isArchived;
};
