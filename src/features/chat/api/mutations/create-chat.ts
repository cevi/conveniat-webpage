import { checkForDuplicateMembers } from '@/features/chat/api/checks/check-for-duplicate-members';
import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { verifyChatName } from '@/features/chat/api/checks/verify-chat-name';
import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat';
import { findChatWithMembers } from '@/features/chat/api/database-interactions/find-chat-with-members';
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

export const createChat = trpcBaseProcedure
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

      const existingChat = await findChatWithMembers(requestedMemberUuids, prisma, false);
      if (existingChat && existingChat.chatMemberships.length === 2) {
        console.log('Found existing private chat:', existingChat.uuid);
        return existingChat.uuid; // Return the ID of the existing chat
      }
    }

    const { checkCapability } = await import('@/lib/capabilities');
    const { CapabilitySubject, CapabilityAction } = await import('@/lib/capabilities/types');

    const isChatCreationEnabled = await checkCapability(
      CapabilityAction.Create,
      CapabilitySubject.Chat,
    );

    if (!isChatCreationEnabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Chat creation is currently disabled.',
      });
    }

    const chat = await createNewChat(finalChatName, locale, user, members, prisma);
    return chat.uuid; // Return the ID of the newly created chat
  });
