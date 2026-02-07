import { apiGet } from '@/features/registration_process/hitobito-api/client';
import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
import {
  addPersonToGroup,
  checkGroupRoleApi,
  patchRole,
} from '@/features/registration_process/hitobito-api/groups';
import type { TaskConfig } from 'payload';

export const ensureGroupMembershipStep: TaskConfig<{
  input: { userId: string };
  output: { success: boolean };
}> = {
  slug: 'ensureGroupMembership',
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
    const { logger } = req.payload;
    const { userId } = input;
    const groupId = HITOBITO_CONFIG.helperGroupId;
    const TARGET_END_DATE = '2027-09-01';

    if (groupId === undefined || groupId === '') {
      const error = new Error('Configuration Error: HELPER_GROUP is missing');
      logger.error(String(error));
      throw error;
    }

    logger.info(`Ensuring group membership for user ${userId} in group ${groupId}...`);

    try {
      // 1. Check if user already has a role in the group
      const existingRoleId = await checkGroupRoleApi(userId, groupId, logger);

      if (typeof existingRoleId === 'string') {
        // Role exists, check if end_on needs update
        const response = await apiGet<{
          data: { id: string; attributes: { end_on?: string; group_id: number } }[];
        }>('/roles', { 'filter[person_id]': userId }, undefined, logger);

        const role = response.data.find((r) => String(r.attributes.group_id) === String(groupId));

        if (role) {
          if (role.attributes.end_on === TARGET_END_DATE) {
            logger.info(`User ${userId} already has correct role in group ${groupId}`);
          } else {
            logger.info(`Updating role ${role.id} end date to ${TARGET_END_DATE}`);
            await patchRole(role.id, { end_on: TARGET_END_DATE }, logger);
          }
        }
      } else {
        // Role does not exist, create it
        logger.info(`Adding user ${userId} to group ${groupId}`);
        await addPersonToGroup(userId, groupId, EXTERNAL_ROLE_TYPE, TARGET_END_DATE, logger);
      }

      return {
        output: {
          success: true,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to ensure group membership: ${errorMessage}`);
      throw error;
    }
  },
};
