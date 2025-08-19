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
