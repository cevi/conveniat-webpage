import type { AlertSetting } from '@/features/payload-cms/payload-types';
import {
  CHAT_CAPABILITY_CAN_SEND_MESSAGES,
  SYSTEM_MSG_TYPE_EMERGENCY_ALERT,
} from '@/lib/chat-shared';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import config from '@payload-config';
import type { Prisma } from '@prisma/client';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';
import { getPayload } from 'payload';
import { z } from 'zod';

const GeolocationCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const EpochTimeStampSchema = z.number();

const GeolocationPositionSchema = z.object({
  coords: GeolocationCoordinatesSchema,
  timestamp: EpochTimeStampSchema,
});

const newAlertSchema = z.object({
  location: GeolocationPositionSchema.optional(),
});

const resolveEmergencyChatName = (locale: string, nickname: string): string => {
  if (locale === 'de') {
    return `Notfall von ${nickname}`;
  }
  if (locale === 'fr') {
    return `Urgence de ${nickname}`;
  }
  return `Emergency from ${nickname}`;
};

export const emergencyRouter = createTRPCRouter({
  newAlert: trpcBaseProcedure
    .input(newAlertSchema)
    .use(databaseTransactionWrapper) // Ensure database transaction is used
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { location } = input;

      // Ensure user exists in DB to prevent relation errors
      // Use upsert to create if missing or update if existing (syncing name)
      await prisma.user.upsert({
        where: { uuid: user.uuid },
        create: {
          uuid: user.uuid,
          name: user.name,
          lastSeen: new Date(),
        },
        update: {
          name: user.name,
          lastSeen: new Date(),
        },
      });

      console.log(
        `New emergency alert from user ${user.nickname} at location: ${JSON.stringify(location)}`,
      );

      const emergencyAlertSystemMessage = {
        payload: {
          system_msg_type: SYSTEM_MSG_TYPE_EMERGENCY_ALERT,
          userUuid: user.uuid,
          userName: user.name,
          userNickname: user.nickname,
        },
      };

      const payloadAPI = await getPayload({ config });
      const alertSettings: AlertSetting = await payloadAPI.findGlobal({
        slug: 'alert_settings',
        locale: ctx.locale,
        fallbackLocale: 'de',
      });

      // Prepare messages with explicit timestamps to ensure order: System -> Location -> Question
      const baseTime = new Date();
      const messagesToCreate: Prisma.MessageCreateWithoutChatInput[] = [];

      // 1. System Message
      messagesToCreate.push({
        contentVersions: { create: emergencyAlertSystemMessage },
        type: MessageType.SYSTEM_MSG,
        createdAt: baseTime,
        messageEvents: {
          create: [{ type: MessageEventType.STORED }],
        },
      });

      // 2. Location Message (if available)
      if (location) {
        messagesToCreate.push({
          contentVersions: {
            create: {
              payload: {
                location: {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                },
              },
            },
          },
          type: MessageType.LOCATION_MSG,
          createdAt: new Date(baseTime.getTime() + 100), // +100ms
          messageEvents: {
            create: [{ type: MessageEventType.STORED }],
          },
        });
      }

      // 3. First Question (if available)
      // Only create the *first* question initially. Subsequent questions are created as user answers.
      const firstQuestion = (alertSettings.questions ?? [])[0];
      if (firstQuestion) {
        messagesToCreate.push({
          contentVersions: {
            create: {
              payload: {
                question: firstQuestion.question,
                options: firstQuestion.options
                  .map((o) => o.option as string | undefined)
                  .filter((o): o is string => o !== undefined),
                selectedOption: undefined,
                questionRefId: firstQuestion.id,
              },
            },
          },
          type: MessageType.ALERT_QUESTION,
          sender: { connect: { uuid: user.uuid } },
          createdAt: new Date(baseTime.getTime() + 200), // +200ms
          messageEvents: {
            create: [{ type: MessageEventType.STORED }],
          },
        });
      }

      // set up the emergency alert in the Payload CMS
      const chat = await prisma.chat.create({
        data: {
          name: resolveEmergencyChatName(ctx.locale, user.nickname),
          type: ChatType.EMERGENCY,

          messages: {
            create: messagesToCreate,
          },

          chatMemberships: {
            create: [
              {
                user: { connect: { uuid: user.uuid } },
                chatPermission: ChatMembershipPermission.MEMBER,
              },
            ],
          },
          capabilities: {
            create: {
              capability: CHAT_CAPABILITY_CAN_SEND_MESSAGES,
              isEnabled: true,
            },
          },
        },
      });

      return { success: true, redirectUrl: `/app/chat/${chat.uuid}` };
    }),
});
