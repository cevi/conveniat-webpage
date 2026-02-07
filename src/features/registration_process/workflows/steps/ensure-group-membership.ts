import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
import {
  addPersonToGroup,
  getPersonGroupRoles,
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
      // 1. Check all existing roles in the group (active or inactive)
      const existingRoles = await getPersonGroupRoles(userId, groupId, logger);

      let correctRoleExists = false;

      for (const role of existingRoles) {
        // If we found a role that is already correct, we are done
        if (role.attributes.end_on === TARGET_END_DATE) {
          logger.info(`User ${userId} already has correct role ${role.id} in group ${groupId}`);
          correctRoleExists = true;
          break;
        }

        // Otherwise, update the role to be active until target date
        logger.info(`Updating existing role ${role.id} end date to ${TARGET_END_DATE}`);
        await patchRole(String(role.id), { end_on: TARGET_END_DATE }, logger);
        correctRoleExists = true;
        // We only need one valid role, so we can stop after patching one
        break;
      }

      if (!correctRoleExists) {
        // No role exists at all, create it
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
