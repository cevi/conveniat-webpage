import { assertChatMember } from '@/features/chat/api/checks/assert-chat-member';
import { canManageChat } from '@/lib/chat-admin-access';
import { isImageKeyOfChat } from '@/lib/chat-images';
import { createPresignedDownloadUrl } from '@/lib/presigned-urls';
import { trpcBaseProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:access');

export const getDownloadUrl = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.uuid(),
      key: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { chatId, key } = input;

    // The admin chat management renders images through this procedure too, for chats the
    // admin is not a member of; it grants what the admin router grants for the chat.
    if (!(await canManageChat(ctx.prisma, ctx.user, chatId))) {
      await assertChatMember(ctx.prisma, ctx.user.uuid, chatId);
    }

    // The bucket is shared with form uploads, exports and bill PDFs.
    if (!isImageKeyOfChat(key, chatId)) {
      logger.warn('Download rejected: key is not an image of this chat', {
        'chat.id': chatId,
        'user.id': ctx.user.uuid,
      });
      throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not an image of this chat.' });
    }

    // The object stays in the bucket, but a deleted image is not signed again for anyone who
    // still holds its key, see `deleteMessage`.
    const deletedImage = await ctx.prisma.messageContent.findFirst({
      where: {
        payload: { path: ['url'], equals: key },
        // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
        message: { chatId, deletedAt: { not: null } },
      },
      select: { uuid: true },
    });
    if (deletedImage !== null) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'This image was deleted.' });
    }

    return {
      url: await createPresignedDownloadUrl(key),
    };
  });
