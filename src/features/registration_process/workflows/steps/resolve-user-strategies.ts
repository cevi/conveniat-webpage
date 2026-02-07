import type { Logger } from '@/features/registration_process/hitobito-api/client';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import { checkGroupRoleApi, patchRole } from '@/features/registration_process/hitobito-api/groups';
import {
  type MatchCandidateResult,
  matchCandidate,
} from '@/features/registration_process/hitobito-api/matcher';
import { createUserSelfRegistration } from '@/features/registration_process/hitobito-api/registrations';
import type { ResolveUserInput } from '@/features/registration_process/hitobito-api/schemas';
import {
  lookupByEmail,
  searchUser,
} from '@/features/registration_process/hitobito-api/user-search';

export interface StrategyContext {
  logger: Logger;
  input: ResolveUserInput;
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
  logger,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  const queries = [
    [input.firstName, input.lastName, input.email, 'nickname' in input ? input.nickname : undefined]
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .join(' '),
    `${input.firstName} ${input.lastName}`,
  ];

  const results: MatchCandidateResult[] = [];

  for (const query of queries) {
    const candidates = await searchUser(query, logger);

    for (const candidate of candidates) {
      if (results.some((r) => r.personId === candidate.id)) continue;

      const match = await matchCandidate(
        candidate,
        {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          nickname: 'nickname' in input ? input.nickname : undefined,
          birthDate: 'birthDate' in input ? input.birthDate : undefined,
        },
        logger,
      );

      if (match.matched) {
        results.push(match);
      }
    }
  }

  if (results.length === 0) return undefined;

  // If we have a single "perfect" match, return it
  const perfectMatch = results.find((r) => !r.needsReview);
  if (perfectMatch) {
    return {
      peopleId: perfectMatch.personId,
      status: 'found',
      reason: 'Matched via search',
      candidates: results,
    };
  }

  // Otherwise, return first match but as ambiguous
  const firstFoundCandidate = results[0];
  if (!firstFoundCandidate) return undefined;

  return {
    peopleId: firstFoundCandidate.personId,
    status: 'ambiguous',
    reason: firstFoundCandidate.reason ?? 'Multiple candidates found or manual review required.',
    candidates: results,
  };
};

export const resolveByEmailLookup = async ({
  input,
  logger,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  const result = await lookupByEmail(input.email, logger);
  if (result.personId != undefined) {
    return { peopleId: result.personId, status: 'found', reason: 'Matched by email API lookup' };
  }
  return undefined;
};

export const createNewUser = async ({
  input,
  logger,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  // Try creation
  const createdId = await createUserSelfRegistration(input, HITOBITO_CONFIG.supportGroupId, logger);

  if (createdId != undefined) {
    // Patch role end date to 30 days
    const roleId = await checkGroupRoleApi(createdId, HITOBITO_CONFIG.supportGroupId, logger);
    if (roleId !== undefined && roleId !== '') {
      const endOn = new Date();
      endOn.setDate(endOn.getDate() + 30);
      const endOnString = endOn.toISOString().split('T')[0]; // YYYY-MM-DD
      /* eslint-disable-next-line unicorn/no-null */
      await patchRole(roleId, { end_on: endOnString ?? null }, logger);
    }

    return { peopleId: createdId, status: 'created', reason: 'Created new user' };
  }

  // Double check: sometimes creation "fails" because they exist but weren't found earlier?
  // Retry email lookup as a safety net
  const verifyResult = await lookupByEmail(input.email, logger);
  if (verifyResult.personId != undefined) {
    // Also patch for existing user found during "fail"
    const roleId = await checkGroupRoleApi(
      verifyResult.personId,
      HITOBITO_CONFIG.supportGroupId,
      logger,
    );
    if (roleId !== undefined && roleId !== '') {
      const endOn = new Date();
      endOn.setDate(endOn.getDate() + 30);
      const endOnString = endOn.toISOString().split('T')[0]; // YYYY-MM-DD
      /* eslint-disable-next-line unicorn/no-null */
      await patchRole(roleId, { end_on: endOnString ?? null }, logger);
    }

    return {
      peopleId: verifyResult.personId,
      status: 'created',
      reason: 'Created (verified by lookup)',
    };
  }

  return;
};
