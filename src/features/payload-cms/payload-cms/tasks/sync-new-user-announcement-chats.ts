import type { ChannelAudience } from '@/features/payload-cms/payload-cms/chat-channels/channel-audience';
import {
  isInChannelAudience,
  loadAudienceContext,
} from '@/features/payload-cms/payload-cms/chat-channels/channel-audience';
import { CHANNEL_COLLECTIONS } from '@/features/payload-cms/payload-cms/chat-channels/channel-collections';
import { findKeptMemberIds } from '@/features/payload-cms/payload-cms/chat-channels/channel-memberships';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import type { ChatMembershipPermission } from '@/lib/prisma/enums';
import { formatUserFullName } from '@/utils/format-user-name';
import type { Payload, TaskConfig } from 'payload';

/** Most channels of one collection the camp will have; far more than it will ever have. */
const MAX_CHANNELS = 1000;

/** A channel with a chat, and what its audience holds in that chat. */
interface ChannelChat {
  audience: ChannelAudience;
  chatUuid: string;
  memberPermission: ChatMembershipPermission;
}

/** The chats of every channel collection; a channel whose chat is not set up yet has none. */
const findChannelChats = async (payload: Payload): Promise<ChannelChat[]> => {
  const chats: ChannelChat[] = [];
  for (const { slug, memberPermission } of CHANNEL_COLLECTIONS) {
    const { docs } = await payload.find({ collection: slug, limit: MAX_CHANNELS, depth: 0 });
    for (const channel of docs) {
      if (typeof channel.chatUuid !== 'string' || channel.chatUuid === '') continue;
      chats.push({ audience: channel, chatUuid: channel.chatUuid, memberPermission });
    }
  }
  return chats;
};

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

      // 2. Fetch the chats of all channels from Payload CMS
      const channels = await findChannelChats(payload);

      // 3. Split the channels into the ones this user belongs to and the rest
      const context = await loadAudienceContext(
        payload,
        channels.map((channel) => channel.audience),
        req,
      );
      const matchingChannels = channels.filter((channel) =>
        isInChannelAudience(user, channel.audience, context),
      );
      const otherChannels = channels.filter((channel) => !matchingChannels.includes(channel));

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
      for (const { chatUuid, memberPermission } of matchingChannels) {
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
            chatPermission: memberPermission,
          },
          update: {},
        });
      }

      // 6. Leave the channels the user no longer belongs to, e.g. an AVP who lost the role.
      // Owners and admins stay, as the channel's own sync keeps them too; so does anyone the
      // channel's chat holds with another permission than its audience gets.
      const staleChatUuids: string[] = [];
      const kept = await findKeptMemberIds(otherChannels.map((channel) => channel.chatUuid));
      for (const permission of new Set(otherChannels.map((channel) => channel.memberPermission))) {
        const chatUuids = otherChannels
          .filter((channel) => channel.memberPermission === permission)
          .map((channel) => channel.chatUuid);
        const staleMemberships = await prisma.chatMembership.findMany({
          where: { userId, chatId: { in: chatUuids }, chatPermission: permission },
          select: { chatId: true },
        });
        if (staleMemberships.length === 0) continue;
        const stale = staleMemberships
          .map((membership) => membership.chatId)
          .filter((chatUuid) => !kept.has(`${chatUuid}:${userId}`));
        if (stale.length === 0) continue;
        await prisma.chatMembership.deleteMany({
          where: { userId, chatId: { in: stale }, chatPermission: permission },
        });
        staleChatUuids.push(...stale);
      }
      await Promise.all(
        staleChatUuids.map((chatUuid) => publishMembershipRevoked(userId, chatUuid, userId)),
      );

      payload.logger.debug(
        `Successfully synced ${matchingChannels.length} announcement chats for user ${userId}, left ${staleChatUuids.length}`,
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
