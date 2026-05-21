import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/lib/db/prisma';
import { ChatMembershipPermission } from '@/lib/prisma/client';
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

    payload.logger.info(`Starting syncNewUserAnnouncementChats for user ${userId}`);

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

      const roleGroupIds: Record<string, number[]> = {
        'full-admin': environmentVariables.CEVIDB_GROUP_FULL_ADMIN,
        'web-core-team': environmentVariables.CEVIDB_GROUP_WEB_CORE_TEAM,
        'translation-team': environmentVariables.CEVIDB_GROUP_TRANSLATION_TEAM,
        'program-team': environmentVariables.CEVIDB_GROUP_PROGRAM_TEAM,
      };

      // Extract group IDs from the user's groups field
      const userGroups = Array.isArray(user.groups) ? (user.groups as { id: number }[]) : [];
      const userGroupSet = new Set(userGroups.map((g) => g.id));

      // 3. Filter channels where this user is eligible
      const matchingChannels = channels.filter((channel) => {
        const { targetType, targetRoles, targetCeviGroups } = channel;

        if (targetType === 'all') return true;

        if (targetType === 'roles' && targetRoles) {
          return targetRoles.some((role) => {
            const allowedIds = roleGroupIds[role];
            return allowedIds?.some((id) => userGroupSet.has(id)) ?? false;
          });
        }

        if (targetType === 'cevi_groups' && targetCeviGroups) {
          return targetCeviGroups.some((tg) => userGroupSet.has(tg.groupId));
        }

        return false;
      });

      // 4. Ensure the user exists in the Prisma User table before creating memberships
      await prisma.user.upsert({
        where: { uuid: userId },
        update: {
          name: user.fullName || user.nickname || 'Unknown User',
        },
        create: {
          uuid: userId,
          name: user.fullName || user.nickname || 'Unknown User',
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

      payload.logger.info(
        `Successfully synced ${matchingChannels.length} announcement chats for user ${userId}`,
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
