import { type ResolveUserByDetails } from '@/features/registration_process/hitobito-api/schemas';
import {
  createNewUser,
  type StrategyResult,
} from '@/features/registration_process/workflows/steps/resolve-user-strategies';
import type { TaskConfig } from 'payload';

export const createUserStep: TaskConfig<'createUser'> = {
  slug: 'createUser',
  retries: 2,
  inputSchema: [
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'nickname', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'personId', type: 'text', required: true },
    { name: 'success', type: 'checkbox', required: true },
    { name: 'error', type: 'text', required: false },
  ],
  interfaceName: 'CreateUserInputOutput',
  handler: async ({ input, req }) => {
    const { logger } = req.payload;

    try {
      // Reuse the strategy logic from resolve-user-strategies
      const details = input as ResolveUserByDetails;
      const result: StrategyResult = await createNewUser({
        input: details,
        logger,
      });

      if (result?.peopleId) {
        return {
          output: {
            personId: String(result.peopleId),
            success: true,
            /* eslint-disable unicorn/no-null */
            error: String(result.reason).includes('verified by lookup')
              ? 'User already existed (found by lookup)'
              : null,
            /* eslint-enable unicorn/no-null */
          },
        };
      }

      return {
        output: {
          personId: '',
          success: false,
          error: 'Self-registration failed and user could not be found by email.',
        },
      };
    } catch (error) {
      const error_ = error as Error;
      return {
        output: {
          personId: '',
          success: false,
          error: error_.message,
        },
      };
    }
  },
};
