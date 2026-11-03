import {
  isInChannelAudience,
  loadAudienceContext,
} from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { formatUserFullName } from '@/utils/format-user-name';
import type { TaskConfig } from 'payload';

export const syncNewUserAnnouncementChatsTask: TaskConfig<{
  input: { userId: string };
  output: { success: boolean };
}> = {
  slug: 'syncNewUserAnnouncementChats',
  retries: 3,
  inputSchema: [
    {
      name: 'userId',
      type: 'text',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'success',
      type: 'checkbox',
    },
  ],
  handler: async ({ input, req }) => {
    const { payload } = req;
    const { userId } = input;

    payload.logger.debug(`Starting syncNewUserAnnouncementChats for user ${userId}`);

    try {
      // 1. Fetch the user from the 'users' collection
      const user = await payload.findByID({
        collection: 'users',
        id: userId,
        depth: 0,
      });

      // 2. Fetch all announcement channels from Payload CMS
      const channelsResult = await payload.find({
        collection: 'announcement-channels',
        limit: 1000,
        depth: 0,
      });

      const channels = channelsResult.docs;

      // 3. Split the channels into the ones this user belongs to and the rest
      const context = await loadAudienceContext(payload, channels, req);
      const matchingChannels = channels.filter((channel) =>
        isInChannelAudience(user, channel, context),
      );
      const otherChatUuids = channels
        .filter((channel) => !matchingChannels.includes(channel))
        .map((channel) => channel.chatUuid)
        .filter((chatUuid): chatUuid is string => typeof chatUuid === 'string' && chatUuid !== '');

      const formattedName = formatUserFullName(user.fullName, user.nickname) || 'Unknown User';

      // 4. Ensure the user exists in the Prisma User table before creating memberships
      await prisma.user.upsert({
        where: { uuid: userId },
        update: {
          name: formattedName,
        },
        create: {
          uuid: userId,
          name: formattedName,
          lastSeen: new Date('1970-01-01T00:00:00Z'),
        },
      });

      // 5. Upsert ChatMembership records in Prisma
      for (const channel of matchingChannels) {
        const chatUuid = channel.chatUuid;
        if (typeof chatUuid === 'string' && chatUuid !== '') {
          await prisma.chatMembership.upsert({
            where: {
              userId_chatId: {
                userId,
                chatId: chatUuid,
              },
            },
            create: {
              userId,
              chatId: chatUuid,
              chatPermission: ChatMembershipPermission.GUEST,
            },
            update: {},
          });
        }
      }

      // 6. Leave the channels the user no longer belongs to, e.g. an AVP who lost the role.
      // Owners and admins stay, as the channel's own sync keeps them too.
      const staleMemberships = await prisma.chatMembership.findMany({
        where: {
          userId,
          chatId: { in: otherChatUuids },
          chatPermission: ChatMembershipPermission.GUEST,
        },
        select: { chatId: true },
      });
      if (staleMemberships.length > 0) {
        await prisma.chatMembership.deleteMany({
          where: {
            userId,
            chatId: { in: staleMemberships.map((membership) => membership.chatId) },
            chatPermission: ChatMembershipPermission.GUEST,
          },
        });
        await Promise.all(
          staleMemberships.map((membership) =>
            publishMembershipRevoked(userId, membership.chatId, userId),
          ),
        );
      }

      payload.logger.debug(
        `Successfully synced ${matchingChannels.length} announcement chats for user ${userId}, left ${staleMemberships.length}`,
      );
      return { output: { success: true } };
    } catch (error) {
      payload.logger.error({
        msg: `Failed to sync announcement chats for user ${userId}`,
        err: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  },
};
