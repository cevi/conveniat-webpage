import { Hitobito, HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { TaskConfig } from 'payload';

export const cleanupTemporaryRolesStep: TaskConfig<{
  input: { userId: string };
  output: { success: boolean };
}> = {
  slug: 'cleanupTemporaryRoles',
  retries: 2,
  inputSchema: [{ name: 'userId', type: 'text', required: true }],
  outputSchema: [{ name: 'success', type: 'checkbox' }],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const { userId } = input;
    const hitobito = Hitobito.create(HITOBITO_CONFIG, logger);

    logger.info(`Cleaning up temporary roles for user ${userId}...`);

    try {
      const roles = await hitobito.groups.getPersonRoles({
        personId: userId,
        groupId: HITOBITO_CONFIG.supportGroupId,
      });

      if (roles.length === 0) {
        logger.info(`No temporary roles found for user ${userId}`);
        return { output: { success: true } };
      }

      for (const role of roles) {
        logger.info(`Removing temporary role ${role.id} in support group`);
        await hitobito.groups.removeRole({ roleId: String(role.id) });
      }

      return { output: { success: true } };
    } catch (error) {
      logger.error(`Failed to cleanup temporary roles for user ${userId}: ${String(error)}`);
      // We don't throw here to ensure the workflow can still complete even if cleanup fails
      return { output: { success: false } };
    }
  },
};
