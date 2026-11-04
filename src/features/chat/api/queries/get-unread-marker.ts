/* Prisma matches a SQL NULL only through null */
import { MessageType, type Prisma } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export interface UnreadMarker {
  /** The first message of the conversation the reader has not read; undefined when none is. */
  firstUnreadMessageId: string | undefined;
  /** How many messages from there on are unread. */
  unreadCount: number;
}

/**
 * Where the "Neue Nachrichten" line goes when the reader opens a chat: before the first
 * message after their read marker (`ChatMembership.lastReadSeq`), counting
 * what the chat list counts as unread there: messages of others and of the system in the
 * conversation, not in threads, and not deleted ones. Their own messages never are.
 *
 * The client asks once, when the chat opens, and holds the answer, so the line stays where it
 * was while messages arrive and the reader reads them.
 */
export const getUnreadMarker = trpcBaseProcedure
  .input(z.object({ chatId: z.uuid() }))
  .query(async ({ input, ctx }): Promise<UnreadMarker> => {
    const { prisma, user } = ctx;
    const { chatId } = input;

    const membership = await prisma.chatMembership.findUnique({
      where: { userId_chatId: { userId: user.uuid, chatId } },
      select: { lastReadSeq: true },
    });
    if (membership === null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Chat with ID ${chatId} not found or access denied`,
      });
    }

    const where: Prisma.MessageWhereInput = {
      chatId,
      parentId: null,
      deletedAt: null,
      // never read anything: all of it
      ...(membership.lastReadSeq === null ? {} : { seq: { gt: membership.lastReadSeq } }),
      OR: [{ senderId: { not: user.uuid } }, { senderId: null }, { type: MessageType.SYSTEM_MSG }],
    };

    const [firstUnread, unreadCount] = await Promise.all([
      prisma.message.findFirst({
        where,
        orderBy: { seq: 'asc' },
        select: { uuid: true },
      }),
      prisma.message.count({ where }),
    ]);

    return { firstUnreadMessageId: firstUnread?.uuid, unreadCount };
  });
