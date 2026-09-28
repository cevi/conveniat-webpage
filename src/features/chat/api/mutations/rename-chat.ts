import { assertChatNotArchived } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { assertChatNameLength } from '@/features/chat/api/checks/verify-chat-name';
import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const renameChatMutationSchema = z.object({
  chatUuid: z.string(),
  newName: z.string().trim().min(1, 'Chat name cannot be empty'),
});

export const renameChat = trpcBaseProcedure
  .input(renameChatMutationSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { locale, prisma, user } = ctx;
    const { chatUuid, newName } = input;

    assertChatNameLength(newName, locale);

    const chat = await findChatByUuid(chatUuid, prisma);

    // Validate that the user is a member of the chat
    if (!isUserMemberOfChat(user, chat.chatMemberships)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat.',
      });
    }

    assertChatNotArchived(chat);

    // check if user is ADMIN or OWNER of the chat
    const userMembership = chat.chatMemberships.find(
      (membership) => membership.userId === user.uuid,
    );

    const permissionsWhichAllowRenaming: ChatMembershipPermission[] = [
      ChatMembershipPermission.OWNER,
      ChatMembershipPermission.ADMIN,
    ];

    if (!userMembership || !permissionsWhichAllowRenaming.includes(userMembership.chatPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to rename this chat.',
      });
    }

    await prisma.chat.update({
      where: { uuid: chatUuid },
      data: { name: newName },
    });
  });
