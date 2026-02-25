import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
  getHitobito,
} from '@/features/registration_process/hitobito-api';
import type { PersonAttributes } from '@/features/registration_process/hitobito-api/schemas';
import { poll } from '@/features/registration_process/hitobito-api/utils';
import {
  resolveByEmailLookup,
  resolveById,
  resolveBySearch,
  type StrategyContext,
  type StrategyResult,
} from '@/features/registration_process/workflows/steps/resolve-user-strategies';
import type { TaskConfig } from 'payload';

export const resolveUserStep: TaskConfig<'resolveUser'> = {
  slug: 'resolveUser',
  retries: 3,
  inputSchema: [
    { name: 'peopleId', type: 'text', required: false },
    { name: 'email', type: 'email', required: false },
    { name: 'firstName', type: 'text', required: false },
    { name: 'lastName', type: 'text', required: false },
    { name: 'nickname', type: 'text', required: false },
    { name: 'birthDate', type: 'text', required: false },
    { name: 'address', type: 'text', required: false },
    { name: 'company', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'peopleId', type: 'text', required: true },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'nickname', type: 'text', required: true },
    { name: 'birthDate', type: 'text', required: true },
    { name: 'address', type: 'text', required: true },
    { name: 'status', type: 'select', options: ['found', 'created', 'ambiguous'], required: true },
    { name: 'reason', type: 'text', required: true },
    { name: 'candidates', type: 'json', required: false },
  ],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const hitobito = await getHitobito(req.payload, logger);
    const context = { logger, input, hitobito };
    const resolutionStrategies = [resolveById, resolveByEmailLookup, resolveBySearch];

    const tryHandleSupportGroupWorkaround = async (
      candidateId: string,
      personName: string,
    ): Promise<PersonAttributes | undefined> => {
      if (
        typeof HITOBITO_CONFIG.supportGroupId !== 'string' ||
        HITOBITO_CONFIG.supportGroupId.length === 0
      ) {
        logger.warn('Skipping support group workaround: HITOBITO_SUPPORT_GROUP_ID not configured');
        return undefined;
      }

      logger.info(`403 Forbidden for ${candidateId}, attempting support group workaround`);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const endOnString = `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;

      try {
        const added = await hitobito.groups.addPerson({
          personId: candidateId,
          groupId: HITOBITO_CONFIG.supportGroupId,
          roleType: EXTERNAL_ROLE_TYPE,
          options: { endOn: endOnString, personName },
        });

        if (!added) return undefined;

        const detailsRetry = await poll(
          () => hitobito.people.getDetails({ personId: candidateId }),
          (response) => response.success,
          {
            maxAttempts: 5,
            initialDelay: 500,
            logger,
            label: `Support group propagation for ${candidateId}`,
          },
        );

        return detailsRetry.success ? detailsRetry.attributes : undefined;
      } catch (error) {
        logger.warn(`Support group workaround failed: ${String(error)}`);
        return undefined;
      }
    };

    const evaluateCandidate = async (
      candidate: StrategyResult | undefined,
      inputName: string,
    ): Promise<{ result: StrategyResult; attributes?: PersonAttributes } | undefined> => {
      if (!candidate) {
        return undefined;
      }

      if (candidate.status !== 'found') {
        return { result: candidate };
      }

      // candidate is narrowed to { status: 'found', peopleId: string } here
      const candidateId = candidate.peopleId;
      const details = await hitobito.people.getDetails({ personId: candidateId });

      if (details.success && details.attributes) {
        return { result: candidate, attributes: details.attributes };
      }

      if (details.error === 'forbidden') {
        const attributes = await tryHandleSupportGroupWorkaround(candidate.peopleId, inputName);
        if (attributes) {
          return { result: candidate, attributes };
        }
      }

      logger.warn(
        `Strategy matched ID ${candidate.peopleId} but API returned ${details.error ?? 'unknown error'}. Skipping.`,
      );

      return undefined;
    };

    let result: StrategyResult | undefined;
    let apiAttributes: PersonAttributes | undefined;

    for (const strategy of resolutionStrategies) {
      try {
        const candidate = await strategy(context as StrategyContext);
        if (!candidate) continue;

        const inputName = [input.firstName, input.lastName].filter(Boolean).join(' ');
        const evaluation = await evaluateCandidate(candidate, inputName);

        if (evaluation) {
          result = evaluation.result;
          apiAttributes = evaluation.attributes;
          break;
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('status 401')) {
          throw new Error('Hitobito API credentials invalid or missing (401 Unauthorized)');
        }
        throw error;
      }
    }

    result ??= {
      peopleId: '',
      status: 'ambiguous',
      reason: 'All automated resolution strategies failed or returned inaccessible IDs.',
    };

    let finalDetails = {
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      nickname: input.nickname ?? '',
      birthDate: input.birthDate ?? '',
      address: input.address ?? '',
    };

    if (result.peopleId !== '' && result.peopleId !== 'generated-temp-id') {
      if (apiAttributes === undefined) {
        const details = await hitobito.people.getDetails({ personId: result.peopleId });
        if (details.success) apiAttributes = details.attributes;
      }

      if (apiAttributes !== undefined) {
        finalDetails = {
          firstName: apiAttributes['first_name'] ?? finalDetails.firstName,
          lastName: apiAttributes['last_name'] ?? finalDetails.lastName,
          nickname: apiAttributes['nickname'] ?? finalDetails.nickname,
          birthDate: apiAttributes['birthday'] ?? finalDetails.birthDate,
          address: apiAttributes['address'] ?? finalDetails.address,
        };
      }
    }

    return {
      output: {
        ...finalDetails,
        peopleId: result.peopleId,
        status: result.status,
        reason: result.reason,
        candidates:
          'candidates' in result && Array.isArray(result.candidates) ? result.candidates : [],
      },
    };
  },
};
