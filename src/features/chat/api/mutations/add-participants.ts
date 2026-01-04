import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const addParticipantsSchema = z.object({
  chatId: z.string(),
  participantIds: z.array(z.string()),
});

export const addParticipants = trpcBaseProcedure
  .input(addParticipantsSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { prisma, user } = ctx;
    const { chatId, participantIds } = input;

    const chat = await findChatByUuid(chatId, prisma);

    // Validate that the user is a member of the chat
    if (!isUserMemberOfChat(user, chat.chatMemberships)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat.',
      });
    }

    // check if user is ADMIN or OWNER of the chat
    const userMembership = chat.chatMemberships.find(
      (membership) => membership.userId === user.uuid,
    );

    const permissionsWhichAllowAdding: ChatMembershipPermission[] = [
      ChatMembershipPermission.OWNER,
      ChatMembershipPermission.ADMIN,
    ];

    if (!userMembership || !permissionsWhichAllowAdding.includes(userMembership.chatPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to add participants to this chat.',
      });
    }

    // Add participants
    // Filter out already existing members to avoid unique constraint errors if any
    const existingMemberIds = new Set(chat.chatMemberships.map((m) => m.userId));
    const newParticipantIds = participantIds.filter((id) => !existingMemberIds.has(id));

    if (newParticipantIds.length > 0) {
      await prisma.chatMembership.createMany({
        data: newParticipantIds.map((userId) => ({
          chatId: chat.uuid,
          userId,
          chatPermission: ChatMembershipPermission.MEMBER,
        })),
        skipDuplicates: true,
      });
    }

    return { success: true };
  });
