import type { EmergencyCardDto } from '@/features/emergency/api/emergency-card-dto';
import { toEmergencyCardDto } from '@/features/emergency/api/emergency-card-dto';
import { getAlertSettingsCached } from '@/features/payload-cms/api/cached-globals';
import type { AlertSetting } from '@/features/payload-cms/payload-types';
import { ChatCapability, SYSTEM_MSG_TYPE_EMERGENCY_ALERT } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { PushNotificationKind } from '@/lib/prisma';
import { sendNotification } from '@/lib/push/send-notification';
import { createTRPCRouter, publicProcedure, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import type { Prisma } from '@prisma/client';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';
import { getPayload } from 'payload';
import { z } from 'zod';
// eslint-disable-next-line import/no-restricted-paths
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';

const logger = createLogger('emergency:router');

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

/**
 * Formats an instant as the calendar day a clock at the camp shows, `YYYY-MM-DD`.
 *
 * The containers run in UTC, so the server's own day would still be yesterday for the first two
 * hours of a Swiss summer day.
 */
const campDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
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

  getEmergencyCards: publicProcedure.query(async ({ ctx }): Promise<EmergencyCardDto[]> => {
    const payloadAPI = await getPayload({ config });
    const response = await payloadAPI.find({
      collection: 'emergency-cards',
      limit: 100,
      depth: 1, // populates the documents and images, which is all the card renders
      locale: ctx.locale,
      fallbackLocale: false,
      draft: false,
      // Documents carry their own permissions. Without this the local API populates every
      // linked document, and a restricted one would show up on the card for everybody.
      overrideAccess: false,
      where: {
        _localized_status: {
          equals: { published: true },
        },
      },
    });
    return response.docs.map((card) => toEmergencyCardDto(card));
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

      // The reporter's nickname and their coordinates are personal data, so neither
      // belongs in a log line that is shipped to Loki and kept.
      logger.debug('New emergency alert received', {
        'user.id': user.uuid,
        'alert.location.present': location !== undefined,
      });

      // Prepare messages with explicit timestamps to ensure order: System -> Location -> Question
      const baseTime = new Date();

      // Human-readable case number, YYYY-MM-DD-XXX, numbered per camp day.
      const dateString = campDateFormatter.format(baseTime);

      // Two alerts on the same day (or one double tap) would otherwise both count the same
      // number of cases and try to insert the same case number. The unique violation of the
      // second one aborts its whole transaction, so a retry could never succeed. Holding a lock
      // per day until this transaction ends lets the second alert count the first one instead.
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`emergency-case:${dateString}`}, 0))`;

      // Counted by case number rather than by creation time, so the count covers exactly the
      // numbers the unique constraint compares against.
      const countToday = await prisma.chat.count({
        where: {
          type: ChatType.EMERGENCY,
          caseNumber: { startsWith: `${dateString}-` },
        },
      });

      const caseNumber = `${dateString}-${String(countToday + 1).padStart(3, '0')}`;

      const payloadAPI = await getPayload({ config });
      const alertSettings: AlertSetting = await payloadAPI.findGlobal({
        slug: 'alert_settings',
        locale: ctx.locale,
        fallbackLocale: 'de',
      });

      // Fetch currently active piket members for emergency
      let activePiketMembers = await getActivePiketMembers(ChatType.EMERGENCY, baseTime).catch(
        (error: unknown) => {
          logger.error('Failed to query the active emergency piket members', { error });
          return [];
        },
      );

      // Filter out the user creating the alert so they don't get auto-added system messages
      // or push notifications for their own alert.
      activePiketMembers = activePiketMembers.filter((member) => member.id !== user.uuid);

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

      // Base additional messages (Location, Questions, Piket notifications)
      const additionalMessagesToCreate: Prisma.MessageCreateWithoutChatInput[] = [];

      // 2. Location Message (if available)
      if (location) {
        additionalMessagesToCreate.push({
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
      const firstQuestion = (alertSettings.questions ?? [])[0];
      if (firstQuestion) {
        additionalMessagesToCreate.push({
          contentVersions: {
            create: {
              payload: {
                question: firstQuestion.question,
                options: firstQuestion.options.map((o) => ({
                  id: o.id,
                  option: o.option,
                })),
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

        additionalMessagesToCreate.push({
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

      const emergencyAlertSystemMessage = {
        payload: {
          system_msg_type: SYSTEM_MSG_TYPE_EMERGENCY_ALERT,
          userUuid: user.uuid,
          userName: user.name,
          userNickname: user.nickname,
          caseNumber,
        },
      };

      const messagesToCreate: Prisma.MessageCreateWithoutChatInput[] = [
        {
          contentVersions: { create: emergencyAlertSystemMessage },
          type: MessageType.SYSTEM_MSG,
          createdAt: baseTime,
          messageEvents: {
            create: [{ type: MessageEventType.STORED }],
          },
        },
        ...additionalMessagesToCreate,
      ];

      const chat = await prisma.chat.create({
        data: {
          name: resolveEmergencyChatName(ctx.locale, user.name),
          type: ChatType.EMERGENCY,
          caseNumber,

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

      // Everything after the insert tells someone about the chat, so it waits for the commit:
      // before it, a rollback would leave the piket woken up for a chat that never existed, and
      // a piket member tapping the push fast enough would open a chat that is not visible yet.
      const chatUuid = chat.uuid;
      const chatName = chat.name;

      // Send push notification to all piket members
      if (activePiketMembers.length > 0) {
        const piketRecipientIds = activePiketMembers.map((m) => m.id);

        let localizedAlertMessage = `Emergency from ${user.name}! (${caseNumber})`;
        if (ctx.locale === 'de') {
          localizedAlertMessage = `Notfall von ${user.name}! (${caseNumber})`;
        } else if (ctx.locale === 'fr') {
          localizedAlertMessage = `Urgence de ${user.name}! (${caseNumber})`;
        }

        ctx.afterTransactionCommit(() => {
          sendNotification(localizedAlertMessage, piketRecipientIds, chatUuid, undefined, {
            kind: PushNotificationKind.EMERGENCY,
            chatName,
            // The alert that starts the emergency chat is the one push that has to wake a
            // piket member up, so it goes out on the siren channel rather than the regular
            // chat channel.
            notificationType: 'emergency',
          }).catch((error: unknown) => {
            logger.error('Failed to send the emergency push notification to the piket members', {
              error,
              'notification.recipient.count': piketRecipientIds.length,
            });
          });
        });
      }

      // Announce the new chat on the personal channels of everyone who was just
      // added (alerting user + auto-added piket members): their SSE connections
      // are not subscribed to the freshly created chat, so without this their
      // open chat overviews would only learn about the chat after a reload.
      // Deferred until after the transaction commits so the refetch it triggers
      // cannot read the pre-membership state.
      const memberIdsToAnnounce = [user.uuid, ...activePiketMembers.map((member) => member.id)];
      ctx.afterTransactionCommit(() => {
        for (const memberId of memberIdsToAnnounce) {
          chatPubSub
            .publish(memberId, {
              type: 'new_chat',
              chatId: chatUuid,
              senderId: user.uuid,
            })
            .catch((error: unknown) => {
              logger.error('Failed to publish the new_chat event for an emergency chat', {
                error,
                'chat.id': chatUuid,
                'user.id': memberId,
              });
            });
        }
      });

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
      ctx.afterTransactionCommit(() => {
        for (const message of createdMessages) {
          chatPubSub
            .publish({
              type: 'new_message',
              chatId: chatUuid,
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
              logger.error('Failed to publish the real-time event for an emergency message', {
                error,
                'chat.id': chatUuid,
                'message.id': message.uuid,
              });
            });
        }
      });

      return { success: true, redirectUrl: `/app/chat/${chat.uuid}`, chatId: chat.uuid };
    }),
});
