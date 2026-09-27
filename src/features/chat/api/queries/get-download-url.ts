import { assertChatMember } from '@/features/chat/api/checks/assert-chat-member';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { chatImageKeyPrefix } from '@/lib/chat-images';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { trpcBaseProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:access');

/**
 * A key directly under the chat's own prefix. The rest may not contain a slash or start with
 * a dot, so `..` cannot step out of it once a browser normalises the URL path.
 */
const isImageOfChat = (key: string, chatId: string): boolean => {
  const prefix = chatImageKeyPrefix(chatId);
  if (!key.startsWith(prefix)) return false;
  return /^[^./][^/]*$/.test(key.slice(prefix.length));
};

export const getDownloadUrl = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      key: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { chatId, key } = input;

    // The admin chat management renders images through this procedure too, for chats the
    // admin is not a member of; it grants the same roles as the admin router.
    const isChatAdmin = hasAccessToThisUser({
      user: ctx.user,
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
    });
    if (!isChatAdmin) {
      await assertChatMember(ctx.prisma, ctx.user.uuid, chatId);
    }

    // The bucket is shared with form uploads, exports and bill PDFs.
    if (!isImageOfChat(key, chatId)) {
      logger.warn('Download rejected: key is not an image of this chat', {
        'chat.id': chatId,
        'user.id': ctx.user.uuid,
      });
      throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not an image of this chat.' });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3ClientPublic, command, { expiresIn: 3600 });

    return {
      url,
    };
  });
