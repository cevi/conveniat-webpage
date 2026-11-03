import { chatError } from '@/features/chat/api/chat-errors';
import { TRPCError } from '@trpc/server';

/**
 * Verifies the chat name based on the number of members.
 * If there is only one member (private chat), the name must be undefined or empty.
 *
 * @param chatName
 * @param members
 */
export const verifyChatName = (
  chatName: string | undefined,
  members: {
    userId: string;
  }[],
): void => {
  if (members.length === 1) {
    if (chatName !== undefined && chatName.trim() !== '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Private chats (with only one other member) cannot have a name.',
      });
    }
  } else {
    if (chatName === undefined || chatName.trim() === '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Group chats must have a name.',
      });
    }
  }
};

/** The same bound the create and rename forms show. A longer name ends up in push titles. */
export const CHAT_NAME_MAX_LENGTH = 50;

/**
 * Throws unless the trimmed chat name fits {@link CHAT_NAME_MAX_LENGTH}.
 *
 * @param chatName - the name as the user typed it
 */
export const assertChatNameLength = (chatName: string | undefined): void => {
  if ((chatName?.trim().length ?? 0) > CHAT_NAME_MAX_LENGTH) {
    throw chatError('BAD_REQUEST', 'chatNameTooLong', { max: CHAT_NAME_MAX_LENGTH });
  }
};
