import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';
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

export const emergencyRouter = createTRPCRouter({
  newAlert: trpcBaseProcedure
    .input(newAlertSchema)
    .use(databaseTransactionWrapper) // Ensure database transaction is used
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { location } = input;

      console.log(
        `New emergency alert from user ${user.nickname} at location: ${JSON.stringify(location)}`,
      );

      const emergencyAlertSystemMessage = {
        payload: {
          system_msg_type: 'emergency_alert',
          userUuid: user.uuid,
          userName: user.name,
          userNickname: user.nickname,
        },
      };

      // set up the emergency alert in the Payload CMS
      const chat = await prisma.chat.create({
        data: {
          name: `Notfall von ${user.nickname}`,
          type: ChatType.EMERGENCY,

          messages: {
            create: [
              {
                contentVersions: { create: emergencyAlertSystemMessage },
                type: MessageType.SYSTEM_MSG,
                messageEvents: {
                  create: [{ type: MessageEventType.STORED }],
                },
              },
            ],
          },

          chatMemberships: {
            create: [
              {
                user: { connect: { uuid: user.uuid } },
                chatPermission: ChatMembershipPermission.MEMBER,
              },
            ],
          },
        },
      });

      if (!location) {
        return { success: true, redirectUrl: `/app/chat/${chat.uuid}` };
      }

      const locationSharingMessage = {
        payload: {
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        },
      };

      // share the current location in the chat
      await prisma.message.create({
        data: {
          chat: { connect: { uuid: chat.uuid } },
          contentVersions: { create: locationSharingMessage },
          type: MessageType.LOCATION_MSG,
          messageEvents: {
            create: [{ type: MessageEventType.STORED }],
          },
        },
      });

      return { success: true, redirectUrl: `/app/chat/${chat.uuid}` };
    }),
});
