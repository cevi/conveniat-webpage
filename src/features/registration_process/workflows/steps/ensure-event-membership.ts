import { Hitobito } from '@/features/registration_process/hitobito-api';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import { poll } from '@/features/registration_process/hitobito-api/utils';
import type { TaskConfig } from 'payload';

export const ensureEventMembershipStep: TaskConfig<{
  input: {
    userId: string;
    firstName?: string;
    lastName?: string;
    answers?: Record<string, string | string[]>;
    internalComment?: string;
  };
  output: {
    success: boolean;
    participationId?: string;
    status?: string;
  };
}> = {
  slug: 'ensureEventMembership',
  retries: 3,
  inputSchema: [
    { name: 'userId', type: 'text', required: true },
    { name: 'firstName', type: 'text', required: false },
    { name: 'lastName', type: 'text', required: false },
    { name: 'answers', type: 'json', required: false },
    { name: 'internalComment', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'participationId', type: 'text' },
    { name: 'status', type: 'text' },
  ],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const { userId, firstName, lastName, answers, internalComment } = input;
    const { helperGroupId: groupId, eventId } = HITOBITO_CONFIG;

    if (groupId === undefined || groupId === '')
      throw new Error('Configuration Error: HELPER_GROUP is missing');
    if (eventId === undefined || eventId === '')
      throw new Error('Configuration Error: EVENT_ID is missing');

    const hitobito = Hitobito.create(HITOBITO_CONFIG, logger);

    logger.info(`Ensuring event membership for user ${userId} in event ${eventId}...`);

    try {
      // 0. Fetch authoritative names if needed
      let safeFirstName = firstName;
      let safeLastName = lastName;

      if (
        safeFirstName === undefined ||
        safeFirstName === '' ||
        safeLastName === undefined ||
        safeLastName === ''
      ) {
        const details = await hitobito.people.getDetails({ personId: userId });
        if (details.success && details.attributes) {
          safeFirstName = details.attributes.first_name ?? safeFirstName;
          safeLastName = details.attributes.last_name ?? safeLastName;
        }
      }

      const personLabel = `${safeFirstName ?? ''} ${safeLastName ?? ''}`.trim();

      // 1. Check / Find Participation (Idempotency)
      let participationId = await hitobito.events.findParticipationId({
        personId: userId,
        eventId,
        options: {
          groupId,
          searchName: personLabel,
        },
      });

      let status: 'exists' | 'created' | 'updated' | 'failed' = 'exists';

      // 2. Add if missing
      if (participationId === undefined || participationId === '') {
        logger.info(`Participation not found, adding user ${personLabel} to event...`);
        participationId = await hitobito.events.addPersonToEvent({
          personId: userId,
          personLabel,
          groupId,
          eventId,
        });
        status = 'created';

        // Verify addition
        if (participationId === undefined || participationId === '') {
          participationId = await poll(
            () =>
              hitobito.events.findParticipationId({
                personId: userId,
                eventId,
              }),
            (id) => id !== undefined && id !== '',
            {
              maxAttempts: 5,
              initialDelay: 500,
              logger,
              label: `Event participation verification for ${userId}`,
            },
          );
        }
      }

      if (participationId === undefined || participationId === '')
        throw new Error('Failed to create participation');

      // 3. Update Details
      if (answers !== undefined || (internalComment !== undefined && internalComment !== '')) {
        logger.info(`Updating participation details for ${participationId}...`);
        const timestamp = new Date().toISOString();
        const comment =
          internalComment !== undefined && internalComment !== ''
            ? `${internalComment} (Updated via Workflow at ${timestamp})`
            : `Updated via Workflow at ${timestamp}`;

        await hitobito.events.updateParticipation({
          participationId,
          eventId,
          data: {
            ...(answers ? { answers } : {}),
            internalComment: comment,
          },
        });
        status = status === 'created' ? 'created' : 'updated';
      }

      return {
        output: { success: true, participationId, status },
      };
    } catch (error) {
      logger.error(`Failed to ensure event membership: ${String(error)}`);
      throw error;
    }
  },
};
