import type { PersonAttributes } from '@/features/registration_process/hitobito-api/types';
import { z } from 'zod';

export const VerificationResultSchema = z.object({
  verified: z.boolean(),
  mismatches: z.array(z.string()),
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
  const matchDetails = {
    nameMatch: true,
    nicknameMatch: true,
    birthdayMatch: true,
    emailMatch: true,
    addressMatch: true,
  };

  const inputName = `${userData.firstName} ${userData.lastName ?? ''}`.trim();
  const apiName = `${apiData.first_name ?? ''} ${apiData.last_name ?? ''}`.trim();

  if (areNamesSimilar(inputName, apiName) === false) {
    matchDetails.nameMatch = false;
    mismatches.push(`Name: expected "${inputName}", got "${apiName}"`);
  }

  // The provided edit introduces a new check for firstName here.
  // This check is redundant with the full name check above if the intention is to verify the full name.
  // However, to faithfully apply the edit, it's included.
  // Note: userData.firstName is guaranteed to be a string by Zod schema, so `!== undefined` and `!== null` are not needed.
  if (
    userData.firstName !== '' &&
    apiData.first_name !== undefined &&
    apiData.first_name !== null &&
    apiData.first_name !== '' &&
    areNamesSimilar(userData.firstName, apiData.first_name) === false
  ) {
    matchDetails.nameMatch = false; // This will overwrite the nameMatch from the full name check if both mismatch.
    mismatches.push(`First Name: expected "${userData.firstName}", got "${apiData.first_name}"`);
  }

  if (
    userData.nickname !== undefined &&
    userData.nickname !== '' &&
    apiData.nickname !== undefined &&
    apiData.nickname !== null &&
    apiData.nickname !== '' &&
    areNamesSimilar(userData.nickname, apiData.nickname) === false
  ) {
    matchDetails.nicknameMatch = false;
    mismatches.push(`Nickname: expected "${userData.nickname}", got "${apiData.nickname}"`);
  }

  // The provided edit for birthDate was malformed and included unrelated code.
  // Applying the instruction to remove redundant type checks and use explicit empty string comparisons.
  // userData.birthDate is `string | undefined`, so `!== undefined` is needed.
  if (
    userData.birthDate !== undefined &&
    userData.birthDate !== '' &&
    apiData.birthday !== undefined &&
    apiData.birthday !== null &&
    apiData.birthday !== '' &&
    userData.birthDate !== apiData.birthday
  ) {
    matchDetails.birthdayMatch = false;
    mismatches.push(`Birthday: expected ${userData.birthDate}, got ${apiData.birthday}`);
  }

  // The provided edit for email was malformed and included unrelated code.
  // Applying the instruction to remove redundant type checks and use explicit empty string comparisons.
  // userData.email is guaranteed to be a string by Zod schema, so `!== undefined` and `!== null` are not needed.
  if (
    userData.email !== '' &&
    apiData.email !== undefined &&
    apiData.email !== null &&
    apiData.email !== '' &&
    userData.email.toLowerCase() !== apiData.email.toLowerCase()
  ) {
    matchDetails.emailMatch = false;
    mismatches.push(`Email: expected ${userData.email}, got ${apiData.email}`);
  }

  return {
    verified: mismatches.length === 0,
    mismatches,
    matchDetails,
  };
}
