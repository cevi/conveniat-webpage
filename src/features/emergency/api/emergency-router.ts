import { getAlertSettingsCached } from '@/features/payload-cms/api/cached-globals';
import type { AlertSetting } from '@/features/payload-cms/payload-types';
import { ChatCapability, SYSTEM_MSG_TYPE_EMERGENCY_ALERT } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { createTRPCRouter, publicProcedure, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import config from '@payload-config';
import type { Prisma } from '@prisma/client';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';
import { getPayload } from 'payload';
import { z } from 'zod';
// eslint-disable-next-line import/no-restricted-paths
import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
// eslint-disable-next-line import/no-restricted-paths
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';

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
  getAlertSettings: publicProcedure.query(async ({ ctx }) => {
    return await getAlertSettingsCached(ctx.locale, false, 'de'); // fallback to german
  }),

  getEmergencyCards: publicProcedure.query(async ({ ctx }) => {
    const payloadAPI = await getPayload({ config });
    const response = await payloadAPI.find({
      collection: 'emergency-cards',
      limit: 100,
      depth: 2, // Ensure documents and images relationships are populated
      locale: ctx.locale,
      where: {
        _status: {
          equals: 'published',
        },
      },
    });
    return response.docs;
  }),

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

      // Fetch currently active piket members for emergency
      const activePiketMembers = await getActivePiketMembers(ChatType.EMERGENCY, baseTime).catch(
        (error: unknown) => {
          console.error('Failed to query active emergency piket members:', error);
          return [];
        },
      );

      // Ensure all active piket members exist in Postgres User table
      for (const member of activePiketMembers) {
        await prisma.user.upsert({
          where: { uuid: member.id },
          create: {
            uuid: member.id,
            name: member.name,
            lastSeen: new Date('1970-01-01T00:00:00Z'),
          },
          update: {
            name: member.name,
          },
        });
      }

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

      // 4. System messages for each auto-added Piket member
      let piketIndex = 1;
      for (const member of activePiketMembers) {
        let messageText = `${member.name} was automatically added (Piket service)`;
        if (ctx.locale === 'de') {
          messageText = `${member.name} wurde automatisch hinzugefügt (Piket-Dienst)`;
        } else if (ctx.locale === 'fr') {
          messageText = `${member.name} a été ajouté automatiquement (Service de piquet)`;
        }

        messagesToCreate.push({
          contentVersions: {
            create: {
              payload: messageText,
            },
          },
          type: MessageType.SYSTEM_MSG,
          createdAt: new Date(baseTime.getTime() + 200 + piketIndex * 10), // +210ms, +220ms, etc.
          messageEvents: {
            create: [{ type: MessageEventType.STORED }],
          },
        });
        piketIndex++;
      }

      // set up the emergency alert in the Payload CMS
      const chat = await prisma.chat.create({
        data: {
          name: resolveEmergencyChatName(ctx.locale, user.nickname ?? user.name),
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
              ...activePiketMembers.map((member) => ({
                user: { connect: { uuid: member.id } },
                chatPermission: ChatMembershipPermission.MEMBER,
              })),
            ],
          },
          capabilities: [ChatCapability.CAN_SEND_MESSAGES],
        },
      });

      // Send push notification to all piket members
      if (activePiketMembers.length > 0) {
        const piketRecipientIds = activePiketMembers.map((m) => m.id);

        let localizedAlertMessage = `Emergency from ${user.nickname ?? user.name}!`;
        if (ctx.locale === 'de') {
          localizedAlertMessage = `Notfall von ${user.nickname ?? user.name}!`;
        } else if (ctx.locale === 'fr') {
          localizedAlertMessage = `Urgence de ${user.nickname ?? user.name}!`;
        }

        sendNotification(localizedAlertMessage, piketRecipientIds, chat.uuid).catch(
          (error: unknown) => {
            console.error('Failed to send push notification to piket members:', error);
          },
        );
      }

      // Fetch the created messages from DB to get their real UUIDs and content payloads
      const createdMessages = await prisma.message.findMany({
        where: { chatId: chat.uuid },
        include: {
          contentVersions: {
            take: 1,
            orderBy: { revision: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Publish new_message events for each message to notify administrators in real-time
      for (const message of createdMessages) {
        chatPubSub
          .publish({
            type: 'new_message',
            chatId: chat.uuid,
            senderId: message.senderId ?? user.uuid,
            message: {
              id: message.uuid,
              createdAt: message.createdAt,
              messagePayload: message.contentVersions[0]?.payload ?? {},
              senderId: message.senderId ?? undefined,
              status: MessageEventType.STORED,
              type: message.type,
            },
          })
          .catch((error: unknown) => {
            console.error('Failed to publish real-time event for emergency message:', error);
          });
      }

      return { success: true, redirectUrl: `/app/chat/${chat.uuid}` };
    }),
});
