import type { Logger, PersonAttributes } from '@/features/registration_process/hitobito-api/types';
import { z } from 'zod';

export const MismatchDetailSchema = z.object({
  field: z.string(),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
});

export type MismatchDetail = z.infer<typeof MismatchDetailSchema>;

export const VerificationResultSchema = z.object({
  verified: z.boolean(),
  score: z.number().min(0).max(100),
  mismatches: z.array(z.string()),
  structuredMismatches: z.array(MismatchDetailSchema),
  matchDetails: z.object({
    nameMatch: z.boolean(),
    nicknameMatch: z.boolean(),
    birthdayMatch: z.boolean(),
    emailMatch: z.boolean(),
    addressMatch: z.boolean(),
  }),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const MatcherUserDataSchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
  email: z.string(),
  nickname: z.string().optional(),
  birthDate: z.string().optional(),
});

export type MatcherUserData = z.infer<typeof MatcherUserDataSchema>;

function areNamesSimilar(a: string, b: string): boolean {
  return (
    a.toLowerCase().trim() === b.toLowerCase().trim() ||
    a.toLowerCase().includes(b.toLowerCase()) ||
    b.toLowerCase().includes(a.toLowerCase())
  );
}

export function verifyUserData(
  userData: MatcherUserData,
  apiData: PersonAttributes,
): VerificationResult {
  const mismatches: string[] = [];
  const structuredMismatches: MismatchDetail[] = [];
  const matchDetails = {
    nameMatch: true,
    nicknameMatch: true,
    birthdayMatch: true,
    emailMatch: true,
    addressMatch: true,
  };

  let score = 0;
  const weights = {
    name: 30,
    email: 40,
    birthday: 20,
    nickname: 10,
  };

  const inputName = `${userData.firstName} ${userData.lastName ?? ''}`.trim();
  const apiName = `${apiData.first_name ?? ''} ${apiData.last_name ?? ''}`.trim();

  // Name Check
  if (areNamesSimilar(inputName, apiName)) {
    score += weights.name;
    // Boost score if it's an exact match (case-insensitive)
    if (inputName.toLowerCase() === apiName.toLowerCase()) {
      score += 5; // Bonus for exact match
    }
  } else {
    matchDetails.nameMatch = false;
    mismatches.push(`Name: expected "${inputName}", got "${apiName}"`);
    structuredMismatches.push({
      field: 'Name',
      expected: inputName,
      actual: apiName,
    });
  }

  // First Name Specific Check (soft check, doesn't penalize score individually if full name matched, but useful for debugging)
  // Check if firstName exists in API data before ensuring similarity
  if (
    userData.firstName !== '' &&
    apiData.first_name !== undefined &&
    apiData.first_name !== null &&
    apiData.first_name !== '' &&
    !areNamesSimilar(userData.firstName, apiData.first_name) &&
    matchDetails.nameMatch
  ) {
    // If full name matched but first name didn't? Unusual but possible with subsets.
    // Let's not double count penalties, but we can track it.
  }

  // Nickname Check
  const hasNicknameInput = userData.nickname !== undefined && userData.nickname !== '';
  const hasNicknameApi =
    apiData.nickname !== undefined && apiData.nickname !== null && apiData.nickname !== '';

  if (hasNicknameInput && hasNicknameApi) {
    // We know they are strings due to checks above
    const nicknameInput = userData.nickname as string;
    const nicknameApi = apiData.nickname as string;

    if (areNamesSimilar(nicknameInput, nicknameApi)) {
      score += weights.nickname;
    } else {
      matchDetails.nicknameMatch = false;
      mismatches.push(`Nickname: expected "${nicknameInput}", got "${nicknameApi}"`);
      structuredMismatches.push({
        field: 'Nickname',
        expected: nicknameInput,
        actual: nicknameApi,
      });
    }
  }

  // Birthday Check
  if (
    userData.birthDate !== undefined &&
    userData.birthDate !== '' &&
    apiData.birthday !== undefined &&
    apiData.birthday !== null &&
    apiData.birthday !== ''
  ) {
    if (userData.birthDate === apiData.birthday) {
      score += weights.birthday;
    } else {
      matchDetails.birthdayMatch = false;
      mismatches.push(`Birthday: expected ${userData.birthDate}, got ${apiData.birthday}`);
      structuredMismatches.push({
        field: 'Birthday',
        expected: userData.birthDate,
        actual: apiData.birthday,
      });
    }
  }

  // Email Check
  if (
    userData.email !== '' &&
    apiData.email !== undefined &&
    apiData.email !== null &&
    apiData.email !== ''
  ) {
    if (userData.email.toLowerCase() === apiData.email.toLowerCase()) {
      score += weights.email;
    } else {
      matchDetails.emailMatch = false;
      mismatches.push(`Email: expected ${userData.email}, got ${apiData.email}`);
      structuredMismatches.push({
        field: 'Email',
        expected: userData.email,
        actual: apiData.email,
      });
    }
  }

  // Normalization of score to 100 max (in case of bonuses)
  score = Math.min(score, 100);

  // If no data points matched at all (score 0), ensure verified is false
  const verified = mismatches.length === 0 && score > 0;

  return {
    verified,
    score,
    mismatches,
    structuredMismatches,
    matchDetails,
  };
}

export interface PollOptions {
  maxAttempts?: number;
  initialDelay?: number;
  backoff?: boolean;
  logger?: Logger;
  label?: string;
}

/**
 * Executes an async action until the predicate returns true or max attempts reached.
 */
export async function poll<T>(
  action: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const { maxAttempts = 5, initialDelay = 500, backoff = true, logger, label = 'Action' } = options;
  let attempts = 0;
  let lastResult: T | undefined;

  while (attempts < maxAttempts) {
    attempts++;
    lastResult = await action();
    if (predicate(lastResult)) {
      if (attempts > 1) {
        logger?.info(`${label} successful after ${attempts} attempts`);
      }
      return lastResult;
    }

    if (attempts < maxAttempts) {
      const delay = backoff ? initialDelay * attempts : initialDelay;
      logger?.info(
        `${label} not ready (attempt ${attempts}/${maxAttempts}), waiting ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult as T;
}
