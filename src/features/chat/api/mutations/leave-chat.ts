import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { getLeftGroupMessagePayload } from '@/features/chat/api/utils/system-message-helpers';
import { isChatArchived } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

/**
 * Picks who takes over a group chat whose last owner leaves: an admin if there is one,
 * otherwise a member. Among those, the one who wrote last, because they are the most
 * likely to still care about the chat. Guests cannot write, so they never inherit it.
 */
const findSuccessor = async (
  chatId: string,
  remaining: { userId: string; chatPermission: ChatMembershipPermission }[],
  prisma: PrismaClientOrTransaction,
): Promise<string | undefined> => {
  const admins = remaining.filter((m) => m.chatPermission === ChatMembershipPermission.ADMIN);
  const members = remaining.filter((m) => m.chatPermission === ChatMembershipPermission.MEMBER);
  const candidates = (admins.length > 0 ? admins : members).map((m) => m.userId).sort();
  if (candidates.length === 0) return undefined;

  const lastMessage = await prisma.message.findFirst({
    where: { chatId, senderId: { in: candidates } },
    orderBy: { createdAt: 'desc' },
    select: { senderId: true },
  });
  return lastMessage?.senderId ?? candidates[0];
};

/**
 * Removes the calling user from a group chat and tells the others with a system message.
 *
 * Only plain group chats can be left: a 1:1 chat has nobody to stay behind, course chats
 * follow the enrolment, and announcement, emergency and support chats are managed for
 * the user. When the last owner leaves, ownership passes on so the chat stays managed.
 *
 * The membership row is deleted, not flagged, so the user can be added again later.
 */
export const leaveChat = trpcBaseProcedure
  .input(z.object({ chatUuid: z.string() }))
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { prisma, user } = ctx;
    const { chatUuid } = input;

    const chat = await findChatByUuid(chatUuid, prisma);

    const membership = chat.chatMemberships.find((m) => m.userId === user.uuid);
    if (!membership) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this chat.' });
    }

    if (chat.type !== ChatType.GROUP) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Chats of type ${chat.type} cannot be left.`,
      });
    }

    if (isChatArchived(chat)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'An archived chat cannot be left, only deleted.',
      });
    }

    const remaining = chat.chatMemberships.filter((m) => m.userId !== user.uuid);
    const isLastOwner =
      membership.chatPermission === ChatMembershipPermission.OWNER &&
      !remaining.some((m) => m.chatPermission === ChatMembershipPermission.OWNER);

    if (isLastOwner && remaining.length > 0) {
      const successorId = await findSuccessor(chat.uuid, remaining, prisma);
      if (successorId === undefined) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Nobody left in this chat can take over as owner. Delete the chat instead.',
        });
      }
      await prisma.chatMembership.update({
        where: { userId_chatId: { userId: successorId, chatId: chat.uuid } },
        data: { chatPermission: ChatMembershipPermission.OWNER },
      });
      logger.debug('Chat ownership passed on by a leaving owner', { 'chat.id': chat.uuid });
    }

    await prisma.chatMembership.delete({
      where: { userId_chatId: { userId: user.uuid, chatId: chat.uuid } },
    });

    const leftMessagePayload = getLeftGroupMessagePayload(user.name);
    const leftMessage = await prisma.message.create({
      data: {
        chatId: chat.uuid,
        type: MessageType.SYSTEM_MSG,
        contentVersions: { create: [{ payload: leftMessagePayload }] },
        messageEvents: {
          create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
        },
      },
    });

    await prisma.chat.update({
      where: { uuid: chat.uuid },
      data: { lastUpdate: new Date() },
    });

    ctx.afterTransactionCommit(() => {
      // Ends the leaver's live subscription to the chat on every device, see the SSE route.
      chatPubSub
        .publish(user.uuid, { type: 'membership_revoked', chatId: chat.uuid, senderId: user.uuid })
        .catch((error: unknown) => {
          logger.error('Failed to publish the membership_revoked event', {
            error,
            'chat.id': chat.uuid,
          });
        });

      chatPubSub
        .publish({
          type: 'new_message',
          chatId: chat.uuid,
          senderId: user.uuid,
          message: {
            id: leftMessage.uuid,
            createdAt: leftMessage.createdAt,
            messagePayload: leftMessagePayload,
            senderId: undefined,
            status: MessageEventType.STORED,
            type: MessageType.SYSTEM_MSG,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish the left-the-chat system message', {
            error,
            'chat.id': chat.uuid,
          });
        });
    });

    return { success: true };
  });
