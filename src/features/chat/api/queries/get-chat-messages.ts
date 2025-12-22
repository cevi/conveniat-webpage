import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatMessage } from '@/features/chat/api/types';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const getChatMessages = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      cursor: z.string().nullish(), // Use message UUID as cursor
      limit: z.number().min(1).max(100).default(25),
    }),
  )
  .query(
    async ({ input, ctx }): Promise<{ items: ChatMessage[]; nextCursor: string | undefined }> => {
      const { chatId, cursor, limit } = input;
      const { prisma } = ctx;

      // Verify chat existence and access
      const chat = await prisma.chat.findUnique({
        where: { uuid: chatId },
        include: {
          chatMemberships: {
            where: { userId: ctx.user.uuid },
          },
        },
      });

      if (!chat || chat.chatMemberships.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Chat with ID ${chatId} not found or access denied`,
        });
      }

      const messages = await prisma.message.findMany({
        take: limit + 1, // Get an extra item at the end to know if there's a next page
        where: {
          chatId: chat.uuid,
        },
        ...(cursor == undefined ? {} : { cursor: { uuid: cursor } }),
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          messageEvents: {
            where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
            orderBy: { uuid: 'desc' },
          },
          contentVersions: {
            take: 1,
            orderBy: { revision: 'desc' },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.uuid;
      }

      const mappedMessages = messages.map((message) => ({
        id: message.uuid,
        createdAt: message.createdAt,
        messagePayload: message.contentVersions[0]?.payload ?? {},
        senderId: message.senderId ?? undefined,
        status: getStatusFromMessageEvents(message.messageEvents),
        type: message.type,
      }));

      return {
        items: mappedMessages,
        nextCursor,
      };
    },
  );
