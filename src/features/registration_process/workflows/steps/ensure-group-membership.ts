import {
  EXTERNAL_ROLE_TYPE,
  Hitobito,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api';
import type { TaskConfig } from 'payload';

export const ensureGroupMembershipStep: TaskConfig<{
  input: { userId: string };
  output: { success: boolean };
}> = {
  slug: 'ensureGroupMembership',
  retries: 3,
  inputSchema: [{ name: 'userId', type: 'text', required: true }],
  outputSchema: [{ name: 'success', type: 'checkbox' }],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const { userId } = input;
    const groupId = HITOBITO_CONFIG.helperGroupId;
    const TARGET_END_DATE = '2027-09-01';

    if (groupId === undefined || groupId === '')
      throw new Error('Configuration Error: HELPER_GROUP is missing');

    const hitobito = Hitobito.create(HITOBITO_CONFIG, logger);

    logger.info(`Ensuring group membership for user ${userId} in group ${groupId}...`);

    try {
      const existingRoles = await hitobito.groups.getPersonRoles({ personId: userId, groupId });

      let correctRoleExists = false;

      for (const role of existingRoles) {
        if (role.attributes.end_on === TARGET_END_DATE) {
          logger.info(
            `Match found: User ${userId} already has correct role ${role.id} in group ${groupId} until ${TARGET_END_DATE}`,
          );
          correctRoleExists = true;
          break;
        }

        logger.info(`Updating existing role ${role.id} end date to ${TARGET_END_DATE}`);
        await hitobito.client.apiRequest('PATCH', `/api/roles/${role.id}`, {
          body: {
            data: {
              type: 'roles',
              id: String(role.id),
              attributes: { end_on: TARGET_END_DATE },
            },
          },
        });
        correctRoleExists = true;
        break;
      }

      if (correctRoleExists === false) {
        logger.info(`Adding user ${userId} to group ${groupId}`);
        await hitobito.groups.addPerson({
          personId: userId,
          groupId,
          roleType: EXTERNAL_ROLE_TYPE,
          options: { endOn: TARGET_END_DATE },
        });
      }

      return {
        output: { success: true },
      };
    } catch (error) {
      logger.error(`Failed to ensure group membership: ${String(error)}`);
      throw error;
    }
  },
};
