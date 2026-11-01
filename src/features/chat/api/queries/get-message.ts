import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatMessage } from '@/features/chat/api/types';
import { findDeletedQuotedMessageIds } from '@/features/chat/api/utils/deleted-messages';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { findThreadSummaries } from '@/features/chat/api/utils/thread-summaries';
import { toChatMessage } from '@/features/chat/api/utils/to-chat-message';
import { trpcBaseProcedure } from '@/trpc/init';
import { MessageEventType } from '@prisma/client';
import { z } from 'zod';

/**
 * One message, for the root of a thread and the quote above the composer, with its sender's
 * name as the message list shows it.
 */
export const getMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.string() }))
  .query(async ({ ctx, input }): Promise<ChatMessage | undefined> => {
    const { prisma } = ctx;
    // Only messages of a chat the user belongs to, as in `getChatMessages`: anything else
    // reads as a message that does not exist.
    const message = await prisma.message.findFirst({
      where: {
        uuid: input.messageId,
        chat: { chatMemberships: { some: { userId: ctx.user.uuid } } },
      },
      include: {
        messageEvents: {
          where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
          orderBy: { uuid: 'desc' },
        },
        contentVersions: {
          orderBy: { revision: 'desc' },
          take: 1,
        },
        sender: { select: { name: true } },
        _count: {
          select: { replies: true },
        },
        reactions: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
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

    const [deletedQuotedIds, threadSummaries] = await Promise.all([
      findDeletedQuotedMessageIds(prisma, [message.contentVersions[0]?.payload]),
      findThreadSummaries(prisma, message._count.replies > 0 ? [message.uuid] : []),
    ]);

    return toChatMessage(message, {
      status: getStatusFromMessageEvents(message.messageEvents),
      deletedQuotedIds,
      threadSummaries,
    });
  });
