import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { Hitobito } from '@/features/registration_process/hitobito-api/index';
import type { ResolveUserInput } from '@/features/registration_process/hitobito-api/schemas';
import type { MatchCandidateResult } from '@/features/registration_process/hitobito-api/services/matcher.service';
import type { Logger } from '@/features/registration_process/hitobito-api/types';

export interface StrategyContext {
  logger: Logger;
  input: ResolveUserInput;
  hitobito: Hitobito;
}

export type StrategyResult =
  | {
      peopleId: string;
      status: 'found' | 'created' | 'ambiguous';
      reason: string;
      candidates?: MatchCandidateResult[];
    }
  | undefined;

export const resolveById = ({ input }: StrategyContext): StrategyResult => {
  if ('peopleId' in input && input.peopleId !== undefined && input.peopleId !== '') {
    return { peopleId: input.peopleId, status: 'found', reason: 'Matched by OAuth ID' };
  }
  return undefined;
};

export const resolveBySearch = async ({
  input,
  hitobito,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  const userData = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    nickname: 'nickname' in input ? input.nickname : undefined,
    birthDate: 'birthDate' in input ? input.birthDate : undefined,
  };

  const processCandidates = async (
    candidates: { id: string | number; label?: string | undefined; text?: string | undefined }[],
    existingResults: MatchCandidateResult[],
  ): Promise<MatchCandidateResult[]> => {
    const newResults: MatchCandidateResult[] = [];
    for (const candidate of candidates) {
      if (
        existingResults.some((r) => r.personId === String(candidate.id)) ||
        newResults.some((r) => r.personId === String(candidate.id))
      ) {
        continue;
      }

      try {
        const match = await hitobito.matcher.matchCandidate({
          candidate: { id: String(candidate.id), label: candidate.label ?? candidate.text ?? '' },
          userData,
        });

        if (match.matched === true) {
          newResults.push(match);
        }
      } catch (error) {
        // If retrieving match details for a specific candidate fails (e.g. 422 Unprocessable Content),
        // we log it and continue. That candidate simply won't be considered a perfect match,
        // and the strategy will either find another or fall back to ambiguous.
        if (error instanceof Error && error.message.includes('status 401')) {
          throw error; // Let auth errors still bring down the job
        }

        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Frontend returned 422 Unprocessable Content')) {
          newResults.push({
            personId: String(candidate.id),
            personLabel: candidate.label ?? candidate.text ?? '',
            matched: false,
            needsReview: true,
            reason: 'Hitobito blocked retrieving extended details.',
          });
        }
      }
    }
    return newResults;
  };

  const evaluateResults = (results: MatchCandidateResult[]): StrategyResult | undefined => {
    if (results.length === 0) return undefined;

    const perfectMatch = results.find((r) => r.needsReview === false);
    if (perfectMatch !== undefined) {
      return {
        peopleId: perfectMatch.personId,
        status: 'found',
        reason: 'Matched via search',
        candidates: results,
      };
    }
    return undefined; /* Ambiguous handled at the very end */
  };

  // --- Tier 1: /full.json Search ---
  const tier1Queries = [
    [input.firstName, input.lastName, input.email, userData.nickname]
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .join(' '),
    `${input.firstName} ${input.lastName}`,
  ];

  const results: MatchCandidateResult[] = [];

  for (const query of tier1Queries) {
    const candidates = await hitobito.people.search({ query });
    const matchResults = await processCandidates(candidates, results);
    results.push(...matchResults);

    const evaluation = evaluateResults(results);
    if (evaluation) return evaluation;
  }

  // --- Tier 2: /people/query Search ---
  const tier2Queries = [
    [input.firstName, input.lastName, userData.nickname]
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .join(' '),
    `${input.firstName} ${input.lastName}`,
  ];

  for (const query of tier2Queries) {
    const candidates = await hitobito.people.searchPeopleQuery({ query });
    const matchResults = await processCandidates(candidates, results);
    results.push(...matchResults);

    const evaluation = evaluateResults(results);
    if (evaluation) return evaluation;
  }

  // If no perfect match was found across both tiers, handle ambiguous/no results
  if (results.length === 0) return undefined;

  const firstFoundCandidate = results[0];
  if (firstFoundCandidate === undefined) return undefined;

  return {
    peopleId: firstFoundCandidate.personId,
    status: 'ambiguous',
    reason: firstFoundCandidate.reason ?? 'Multiple candidates found or manual review required.',
    candidates: results,
  };
};

export const resolveByEmailLookup = async ({
  input,
  hitobito,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;
  const result = await hitobito.people.lookupByEmail({ email: input.email });
  if (result !== undefined) {
    return { peopleId: result.id, status: 'found', reason: 'Matched by email API lookup' };
  }
  return undefined;
};

export const createNewUser = async ({
  input,
  logger,
  hitobito,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  // 1. Guarded Transition: Check if user already exists before registration
  const existing = await hitobito.people.lookupByEmail({ email: input.email });
  if (existing !== undefined) {
    logger.info(`User with email ${input.email} already exists (found via lookup)`);

    // Ensure they have a support group role (idempotent update)
    const roleId = await hitobito.groups.checkActiveRole({
      personId: existing.id,
      groupId: HITOBITO_CONFIG.supportGroupId,
    });

    if (roleId !== undefined && roleId !== '') {
      const endOn = new Date();
      endOn.setDate(endOn.getDate() + 30);
      const endOnString = endOn.toISOString().split('T')[0];

      await hitobito.client.apiRequest('PATCH', `/api/roles/${roleId}`, {
        body: {
          data: {
            type: 'roles',
            id: String(roleId),
            attributes: { end_on: endOnString },
          },
        },
      });
    }

    return { peopleId: existing.id, status: 'created', reason: 'Created (verified by lookup)' };
  }

  // 2. Perform Mutation: Try creation
  const createdId = await hitobito.registrations.createUserSelfRegistration({
    userData: input,
    groupId: HITOBITO_CONFIG.supportGroupId,
  });

  if (createdId !== undefined && createdId !== '') {
    const roleId = await hitobito.groups.checkActiveRole({
      personId: createdId,
      groupId: HITOBITO_CONFIG.supportGroupId,
    });
    if (roleId !== undefined && roleId !== '') {
      const endOn = new Date();
      endOn.setDate(endOn.getDate() + 30);
      const endOnString = endOn.toISOString().split('T')[0];

      await hitobito.client.apiRequest('PATCH', `/api/roles/${roleId}`, {
        body: {
          data: {
            type: 'roles',
            id: String(roleId),
            attributes: { end_on: endOnString },
          },
        },
      });
    }

    return { peopleId: createdId, status: 'created', reason: 'Created new user' };
  }

  // Final Safety net (in case registration succeeded but returned empty)
  const finalVerify = await hitobito.people.lookupByEmail({ email: input.email });
  if (finalVerify !== undefined) {
    return {
      peopleId: finalVerify.id,
      status: 'created',
      reason: 'Created (verified by final lookup)',
    };
  }

  return;
};
