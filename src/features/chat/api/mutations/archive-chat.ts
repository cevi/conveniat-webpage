import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { markChatAsArchived } from '@/features/chat/api/database-interactions/mark-chat-as-archived';
import { markChatAsDeletedForUser } from '@/features/chat/api/database-interactions/mark-chat-as-deleted-for-user';
import { canUserArchiveChat } from '@/features/chat/api/permission-checks/can-user-archive-chat';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const archiveChatMutationSchema = z.object({
  chatUuid: z.string(),
});

export const archiveChat = trpcBaseProcedure
  .input(archiveChatMutationSchema)
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { chatUuid } = input;

    const chat = await findChatByUuid(chatUuid, prisma);

    if (!canUserArchiveChat(user, chat.chatMemberships)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `User ${user.uuid} does not have permission to archive chat ${chatUuid}.`,
      });
    }

    await markChatAsArchived(chat, prisma);
    await markChatAsDeletedForUser(chat, user, prisma);
  });
