import { chatError } from '@/features/chat/api/chat-errors';
import {
  CHAT_NAME_MAX_LENGTH,
  CHAT_NAME_MIN_LENGTH,
  chatNameProblem,
} from '@/features/chat/limits';
import { TRPCError } from '@trpc/server';

/**
 * Refuses a name on a private chat (one other member). A group's name is checked by
 * {@link parseChatName}.
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
  if (members.length === 1 && chatName !== undefined && chatName.trim() !== '') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Private chats (with only one other member) cannot have a name.',
    });
  }
};

/**
 * Returns the trimmed group name, or throws unless it fits `chatNameSchema`. A browser on the
 * previous release still allows 2 characters, and its offline outbox may replay such a name,
 * so both bounds are reasons the user reads.
 *
 * @param chatName - the name as the user typed it
 */
export const parseChatName = (chatName: string): string => {
  const problem = chatNameProblem(chatName);
  if (problem === 'tooShort') {
    throw chatError('BAD_REQUEST', 'chatNameTooShort', { min: CHAT_NAME_MIN_LENGTH });
  }
  if (problem === 'tooLong') {
    throw chatError('BAD_REQUEST', 'chatNameTooLong', { max: CHAT_NAME_MAX_LENGTH });
  }
  return chatName.trim();
};
