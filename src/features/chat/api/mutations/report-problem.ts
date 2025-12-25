import {
  CHAT_CAPABILITY_CAN_SEND_MESSAGES,
  CHAT_CAPABILITY_PICTURE_UPLOAD,
} from '@/lib/chat-shared';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import type { StaticTranslationString } from '@/types/types';
import { z } from 'zod';

const systemMessageContent: StaticTranslationString = {
  en: 'Please describe the problem and attach photos (detail + wide angle).',
  de: 'Bitte beschreibe das Problem und füge Fotos hinzu (Detail- und Weitwinkelaufnahme).',
  fr: 'Veuillez décrire le problème et joindre des photos (détail et grand angle).',
};

export const reportProblem = trpcBaseProcedure
  .input(
    z
      .object({
        location: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
      })
      .optional(),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;

    const chatName = `Problem Report - ${new Date().toLocaleDateString()} - ${user.name}`;

    // Create the support chat
    const chat = await prisma.chat.create({
      data: {
        name: chatName,
        type: ChatType.SUPPORT_GROUP,
        status: 'OPEN',
        description: 'User reported problem from map',
        chatMemberships: {
          create: {
            userId: user.uuid,
            chatPermission: 'OWNER',
          },
        },
        capabilities: {
          create: [
            {
              capability: CHAT_CAPABILITY_PICTURE_UPLOAD,
              isEnabled: true,
            },
            {
              capability: CHAT_CAPABILITY_CAN_SEND_MESSAGES,
              isEnabled: true,
            },
          ],
        },
      },
    });

    // 1. Create the initial system message
    await prisma.message.create({
      data: {
        chatId: chat.uuid,
        type: MessageType.SYSTEM_MSG,
        contentVersions: {
          create: {
            payload: {
              ...systemMessageContent,
              ...(input?.location
                ? {
                    location: {
                      longitude: input.location[0],
                      latitude: input.location[1],
                    },
                  }
                : {}),
            },
          },
        },
        messageEvents: {
          create: {
            type: MessageEventType.CREATED,
          },
        },
      },
    });

    return chat;
  });
