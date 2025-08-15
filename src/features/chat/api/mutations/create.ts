import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat';
import { findChatWithMembers } from '@/features/chat/api/database-interactions/find-chat-with-members';
import { isUserMemberOfChat } from '@/features/chat/api/permission-checks/is-user-member-of-chat';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const contactSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid chat ID format.'),
});

const createChatInputSchema = z.object({
  members: z
    .array(contactSchema)
    .min(1, 'A chat must have at least one member besides the creator.'),
  chatName: z.string().optional(), // full verification done in business logic
});

/**
 * Verifies the chat name based on the number of members.
 * If there is only one member (private chat), the name must be undefined or empty.
 *
 * @param chatName
 * @param members
 */
const verifyChatName = (
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

const checkForDuplicateMembers = (
  members: {
    userId: string;
  }[],
): void => {
  const memberUuids = members.map((member) => member.userId);
  const uniqueMemberUuids = new Set(memberUuids);
  if (uniqueMemberUuids.size !== memberUuids.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Duplicate members are not allowed in the chat.',
    });
  }
};

export const create = trpcBaseProcedure
  .input(createChatInputSchema)
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { locale, prisma, user } = ctx;
    const { members, chatName } = input;

    if (isUserMemberOfChat(user, members)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You must be a member of the chat you are trying to create.',
      });
    }

    // additional validation checks
    checkForDuplicateMembers(members);
    verifyChatName(chatName, members);

    const finalChatName = chatName?.trim() ?? '';

    // If it's a private chat, check if there is already a chat with the same members
    if (members.length === 1) {
      const requestedMemberUuids = [user.uuid, ...members.map((member) => member.userId)].sort();

      const existingChat = await findChatWithMembers(requestedMemberUuids, prisma);
      if (existingChat && existingChat.chatMemberships.length === 2) {
        console.log('Found existing private chat:', existingChat.uuid);
        return existingChat.uuid; // Return the ID of the existing chat
      }
    }

    const chat = await createNewChat(finalChatName, locale, user, members, prisma);
    return chat.uuid; // Return the ID of the newly created chat
  });
