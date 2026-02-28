import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
  getHitobito,
} from '@/features/registration_process/hitobito-api';
import { ApprovalRequiredError } from '@/features/registration_process/hitobito-api/errors';
import type { TaskConfig } from 'payload';

export const ensureGroupMembershipStep: TaskConfig<{
  input: { userId: string };
  output: {
    success: boolean;
    approvalRequired?: boolean;
    approvalGroupName?: string;
    approvalGroupUrl?: string;
    status?: 'exists' | 'created';
  };
}> = {
  slug: 'ensureGroupMembership',
  retries: 3,
  inputSchema: [{ name: 'userId', type: 'text', required: true }],
  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'approvalRequired', type: 'checkbox' },
    { name: 'approvalGroupName', type: 'text' },
    { name: 'approvalGroupUrl', type: 'text' },
    { name: 'status', type: 'text' },
  ],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const { userId } = input;
    const groupId = HITOBITO_CONFIG.helperGroupId;
    const TARGET_END_DATE = '2027-09-01';

    if (groupId === undefined || groupId === '')
      throw new Error('Configuration Error: HELPER_GROUP is missing');

    const hitobito = await getHitobito(req.payload, logger);

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

        logger.info(`Replacing existing role ${role.id} to update end date to ${TARGET_END_DATE}`);
        await hitobito.groups.removeRole({ roleId: String(role.id) });
        // CorrectRoleExists stays false, so it will fall through to the add logic
        correctRoleExists = false;
        break;
      }

      if (correctRoleExists === false) {
        // Workaround: Hitobito requires the personName (label) to submit the roles form
        // Since we don't have the label directly in this task, we can construct a fallback
        const personDetails = await hitobito.people.getDetails({ personId: userId });
        if (!personDetails.success || !personDetails.attributes) {
          throw new Error(
            `Could not retrieve user details for ${userId} required for group addition (${personDetails.error ?? 'unknown error'})`,
          );
        }
        const firstName = personDetails.attributes.first_name ?? '';
        const lastName = personDetails.attributes.last_name ?? '';
        const trimmedName = `${firstName} ${lastName}`.trim();
        const personName = trimmedName === '' ? `User ${userId}` : trimmedName;

        logger.info(`Adding user ${userId} (${personName}) to group ${groupId}`);
        await hitobito.groups.addPerson({
          personId: userId,
          groupId,
          roleType: EXTERNAL_ROLE_TYPE,
          options: { endOn: TARGET_END_DATE, personName },
        });
      }

      return {
        output: {
          success: true,
          approvalRequired: false,
          status: correctRoleExists ? 'exists' : 'created',
        },
      };
    } catch (error) {
      if (error instanceof ApprovalRequiredError) {
        logger.info(
          `User ${userId} requires Hitobito approval before addition (group ${error.groupUrl}). Pause workflow.`,
        );
        return {
          output: {
            success: false,
            approvalRequired: true,
            approvalGroupName: error.groupName,
            approvalGroupUrl: error.groupUrl,
          },
        };
      }
      logger.error('Failed to ensure group membership.');
      // Minify the error so the Payload job logger doesn't stringify massive payloads
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ensureGroupMembership failed: ${message}`);
    }
  },
};
