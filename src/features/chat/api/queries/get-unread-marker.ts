/* eslint-disable unicorn/no-null -- Prisma matches a SQL NULL only through null */
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
 * message after their read high-water mark (`ChatMembership.lastReadMessageId`), counting
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
      select: { lastReadMessageId: true },
    });
    if (membership === null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Chat with ID ${chatId} not found or access denied`,
      });
    }

    const lastRead =
      membership.lastReadMessageId === null
        ? null
        : await prisma.message.findFirst({
            where: { uuid: membership.lastReadMessageId, chatId },
            select: { uuid: true, createdAt: true },
          });

    const where: Prisma.MessageWhereInput = {
      chatId,
      parentId: null,
      deletedAt: null,
      AND: [
        {
          OR: [
            { senderId: { not: user.uuid } },
            { senderId: null },
            { type: MessageType.SYSTEM_MSG },
          ],
        },
        // never read anything, or the mark points at a message that is gone: all of it
        lastRead === null
          ? {}
          : {
              OR: [
                { createdAt: { gt: lastRead.createdAt } },
                { createdAt: lastRead.createdAt, uuid: { gt: lastRead.uuid } },
              ],
            },
      ],
    };

    const [firstUnread, unreadCount] = await Promise.all([
      prisma.message.findFirst({
        where,
        orderBy: [{ createdAt: 'asc' }, { uuid: 'asc' }],
        select: { uuid: true },
      }),
      prisma.message.count({ where }),
    ]);

    return { firstUnreadMessageId: firstUnread?.uuid, unreadCount };
  });
