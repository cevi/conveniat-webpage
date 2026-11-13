import { assertChatMember } from '@/features/chat/api/checks/assert-chat-member';
import { canManageChat } from '@/lib/chat-admin-access';
import { isImageKeyOfChat } from '@/lib/chat-images';
import { createPresignedDownloadUrl } from '@/lib/presigned-urls';
import { ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:access');

/**
 * A forum post moved to another topic keeps the keys of the topic it was written in, see
 * `moveForumPost`. Its images are this topic's then because one of its own messages carries
 * them: a comment's image as its content, a post's in its list of images. Only a key of some
 * chat's images counts, so nothing else in the bucket gets signed this way.
 */
const isImageOfMovedForumPost = async (
  prisma: PrismaClientOrTransaction,
  key: string,
  chatId: string,
): Promise<boolean> => {
  if (!CHAT_IMAGE_KEY.test(key)) return false;
  const carrier = await prisma.messageContent.findFirst({
    where: {
      message: { chatId, chat: { type: { in: [ChatType.FORUM, ChatType.FORUM_CONVERSATION] } } },
      OR: [
        { payload: { path: ['url'], equals: key } },
        { payload: { path: ['images'], array_contains: [key] } },
      ],
    },
    select: { uuid: true },
  });
  return carrier !== null;
};

/** `chat-images/<chat id>/<file>`, see `chatImageKeyPrefix`. */
const CHAT_IMAGE_KEY = /^chat-images\/[\da-f-]{36}\/[^./][^/]*$/i;

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
    const manages = await canManageChat(ctx.prisma, ctx.user, chatId);
    if (!manages) await assertChatMember(ctx.prisma, ctx.user.uuid, chatId);

    // The bucket is shared with form uploads, exports and bill PDFs.
    if (
      !isImageKeyOfChat(key, chatId) &&
      !(await isImageOfMovedForumPost(ctx.prisma, key, chatId))
    ) {
      logger.warn('Download rejected: key is not an image of this chat', {
        'chat.id': chatId,
        'user.id': ctx.user.uuid,
      });
      throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not an image of this chat.' });
    }

    // The object stays in the bucket, but a deleted image is not signed again for anyone who
    // still holds its key, see `deleteMessage`. A key names a single message, see
    // `createMessage`, so only the image's own sender can take it away.
    // A forum post's photos go with it too, when its author or a moderator deletes it, and are
    // not signed for anyone who may not read it: a post waiting for approval, or a post or a
    // comment a moderator hid.
    const carriers = await ctx.prisma.messageContent.findMany({
      where: {
        OR: [
          { payload: { path: ['url'], equals: key } },
          { payload: { path: ['images'], array_contains: [key] } },
        ],
        message: { chatId },
      },
      select: { message: { select: { uuid: true, deletedAt: true } } },
    });
    if (carriers.some(({ message }) => message !== null && message.deletedAt !== null)) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'This image was deleted.' });
    }
    const carrierId = carriers.find(({ message }) => message !== null)?.message?.uuid;
    // the admin chat management sees what it manages, as the admin router does
    if (carrierId !== undefined && !manages) {
      const { isForumMessageHiddenFrom } =
        await import('@/features/chat/api/forum/forum-visibility');
      if (await isForumMessageHiddenFrom(ctx.prisma, ctx.user, carrierId)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This image was deleted.' });
      }
    }

    return {
      url: await createPresignedDownloadUrl(key),
    };
  });
