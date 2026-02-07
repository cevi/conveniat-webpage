import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
import {
  addPersonToGroup,
  removeGroupRole,
} from '@/features/registration_process/hitobito-api/groups';
import type { PersonAttributes } from '@/features/registration_process/hitobito-api/schemas';
import { getPersonDetails } from '@/features/registration_process/hitobito-api/user-details';
import {
  resolveByEmailLookup,
  resolveById,
  resolveBySearch,
  type StrategyContext,
  type StrategyResult,
} from '@/features/registration_process/workflows/steps/resolve-user-strategies';
import type { TaskConfig } from 'payload';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const context = { logger, input };
    const resolutionStrategies = [resolveById, resolveBySearch, resolveByEmailLookup];

    let result: StrategyResult;
    let apiAttributes: PersonAttributes | undefined; // Cache attributes if we fetch them during verification

    // 1. Run Strategies with Verification
    for (const strategy of resolutionStrategies) {
      const candidate = await strategy(context as StrategyContext);

      if (candidate) {
        // If a strategy says "Found", we must verify the user is actually accessible.
        // This prevents the "Ghost ID" issue where ID 4 exists in input but is 404 in API.
        if (candidate.status === 'found') {
          try {
            const details = await getPersonDetails(candidate.peopleId, logger);

            if (details.success && details.attributes) {
              // Valid Match: We have the ID AND the data
              result = candidate;
              apiAttributes = details.attributes;
              break; // Stop loop
            } else if (details.error === 'forbidden') {
              // Forbidden: Add to support group and retry
              logger.info(
                `403 Forbidden for ${candidate.peopleId}, attempting support group workaround`,
              );

              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + 30);
              const endOnString = `${futureDate.getDate().toString().padStart(2, '0')}.${(futureDate.getMonth() + 1).toString().padStart(2, '0')}.${futureDate.getFullYear()}`;

              try {
                const personName = [input.firstName, input.lastName].filter(Boolean).join(' ');
                const added = await addPersonToGroup(
                  candidate.peopleId,
                  HITOBITO_CONFIG.supportGroupId,
                  EXTERNAL_ROLE_TYPE,
                  endOnString,
                  logger,
                  personName,
                );

                if (added) {
                  // Wait for propagation
                  await sleep(2000);

                  // Retry
                  const detailsRetry = await getPersonDetails(candidate.peopleId, logger);
                  if (detailsRetry.success && detailsRetry.attributes) {
                    result = candidate;
                    apiAttributes = detailsRetry.attributes;
                    break;
                  }
                }
              } catch (error) {
                logger.warn(`Support group workaround failed: ${String(error)}`);
              }
            }

            // If we still don't have a result, log and continue
            if (!result) {
              logger.warn(
                `Strategy matched ID ${candidate.peopleId} but API returned ${details.error}. Skipping and trying next strategy.`,
              );
            }
          } catch (error) {
            logger.error(`Error verifying candidate ${candidate.peopleId}: ${String(error)}`);
          }
        } else {
          // For 'created' or 'ambiguous' statuses, we accept them immediately
          result = candidate;
          break;
        }
      }
    }

    // 2. Fallback if all strategies (including search/email) failed
    result ??= {
      peopleId: '',
      status: 'ambiguous',
      reason: 'All automated resolution strategies failed or returned inaccessible IDs.',
    };

    // 3. Initialize Final Details (Baseline = User Input)
    let finalDetails = {
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      nickname: input.nickname ?? '',
      birthDate: input.birthDate ?? '',
      address: input.address ?? '',
    };

    // 4. Hydrate / Merge with API Data
    // We might have already fetched attributes in the loop above (apiAttributes)
    if (result.peopleId !== '' && result.peopleId !== 'generated-temp-id') {
      // If we didn't fetch it in the loop (e.g. it was 'created'), try fetching now
      if (apiAttributes === undefined) {
        const details = await getPersonDetails(result.peopleId, logger);
        if (details.success) {
          apiAttributes = details.attributes;
        }
      }

      if (apiAttributes !== undefined) {
        // Use || to allow API to overwrite empty input strings
        finalDetails = {
          firstName: apiAttributes['first_name'] ?? finalDetails.firstName,
          lastName: apiAttributes['last_name'] ?? finalDetails.lastName,
          nickname: apiAttributes['nickname'] ?? finalDetails.nickname,
          birthDate: apiAttributes['birthday'] ?? finalDetails.birthDate,
          address: apiAttributes['address'] ?? finalDetails.address,
        };
      }

      // 5. Cleanup Support Group Role
      // Remove from support group if we found a valid user ID (resolved)
      try {
        await removeGroupRole(result.peopleId, HITOBITO_CONFIG.supportGroupId, logger);
      } catch (error) {
        logger.warn(`Failed to cleanup support group role: ${String(error)}`);
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
