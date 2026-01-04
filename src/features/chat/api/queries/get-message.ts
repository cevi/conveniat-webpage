import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { trpcBaseProcedure } from '@/trpc/init';
import { MessageEventType } from '@prisma/client';
import { z } from 'zod';

export const getMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const message = await prisma.message.findUnique({
      where: { uuid: input.messageId },
      include: {
        messageEvents: {
          where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
          orderBy: { uuid: 'desc' },
        },
        contentVersions: {
          orderBy: { revision: 'desc' },
          take: 1,
        },
        _count: {
          select: { replies: true },
        },
        replies: {
          where: {
            senderId: { not: ctx.user.uuid },
            messageEvents: {
              none: {
                type: MessageEventType.READ,
                userId: ctx.user.uuid,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!message) return;

    return {
      id: message.uuid,
      createdAt: message.createdAt,
      messagePayload: message.contentVersions[0]?.payload ?? {},
      senderId: message.senderId ?? undefined,
      status: getStatusFromMessageEvents(message.messageEvents),
      type: message.type,
      replyCount: message._count.replies,
      parentId: message.parentId ?? undefined,
      hasUnreadReplies: message.replies.length > 0,
    };
  });
