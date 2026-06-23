import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { Hitobito } from '@/features/registration_process/hitobito-api/index';
import type { ResolveUserInput } from '@/features/registration_process/hitobito-api/schemas';
import type { MatchCandidateResult } from '@/features/registration_process/hitobito-api/services/matcher.service';
import type { Logger, PersonResource } from '@/features/registration_process/hitobito-api/types';

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
  logger,
}: StrategyContext): Promise<StrategyResult> => {
  if (!('email' in input)) return undefined;

  const userData = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    nickname: 'nickname' in input ? input.nickname : undefined,
    birthDate: 'birthDate' in input ? input.birthDate : undefined,
  };

  const results: MatchCandidateResult[] = [];
  const candidates: PersonResource[] = [];
  const seenIds = new Set<string>();

  const addCandidates = (list: PersonResource[]): void => {
    for (const item of list) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        candidates.push(item);
      }
    }
  };

  try {
    const nameResults = await hitobito.people.searchByNames({
      firstName: input.firstName,
      lastName: input.lastName,
    });
    addCandidates(nameResults);

    if ('nickname' in input && input.nickname !== undefined && input.nickname !== '') {
      const nicknameResults = await hitobito.people.searchByNicknameAndLastName({
        nickname: input.nickname,
        lastName: input.lastName,
      });
      addCandidates(nicknameResults);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('status 401')) {
      throw error; // Let auth errors still bring down the job
    }
    logger.warn(
      `Search failed for ${input.firstName} ${input.lastName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  for (const candidate of candidates) {
    try {
      const emailPart =
        typeof candidate.attributes.email === 'string' && candidate.attributes.email !== ''
          ? ` (${candidate.attributes.email})`
          : '';
      const label =
        `${candidate.attributes.first_name ?? ''} ${candidate.attributes.last_name ?? ''}${emailPart}`.trim();

      const match = await hitobito.matcher.matchCandidate({
        candidate: { id: candidate.id, label },
        userData,
        details: candidate.attributes,
      });

      if (match.matched === true) {
        results.push(match);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('status 401')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Frontend returned 422 Unprocessable Content')) {
        const emailPart =
          typeof candidate.attributes.email === 'string' && candidate.attributes.email !== ''
            ? ` (${candidate.attributes.email})`
            : '';
        const label =
          `${candidate.attributes.first_name ?? ''} ${candidate.attributes.last_name ?? ''}${emailPart}`.trim();
        results.push({
          personId: candidate.id,
          personLabel: label,
          matched: false,
          needsReview: true,
          reason: 'Hitobito blocked retrieving extended details.',
        });
      }
    }
  }

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

  // If no perfect match was found, handle ambiguous/no results
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
