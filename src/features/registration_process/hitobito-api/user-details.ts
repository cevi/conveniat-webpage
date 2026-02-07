import type { Logger } from '@/features/registration_process/hitobito-api/client';
import { apiGet } from '@/features/registration_process/hitobito-api/client';
import type { PersonAttributes } from '@/features/registration_process/hitobito-api/schemas';
import { PersonResourceSchema } from '@/features/registration_process/hitobito-api/schemas';

export interface GetPersonDetailsResult {
  success: boolean;
  attributes?: PersonAttributes;
  error?: 'forbidden' | 'not_found' | 'other';
  rawError?: string;
}

export interface VerificationResult {
  verified: boolean;
  mismatches: string[];
  matchDetails: {
    nameMatch: boolean;
    nicknameMatch: boolean;
    birthdayMatch: boolean;
    emailMatch: boolean;
    addressMatch: boolean;
  };
}

export async function getPersonDetails(
  personId: string,
  logger?: Logger,
): Promise<GetPersonDetailsResult> {
  try {
    const response = await apiGet<{ data: unknown }>(
      `/api/people/${personId}`,
      undefined,
      undefined,
      logger,
    );
    const result = PersonResourceSchema.safeParse(response.data);

    if (!result.success) {
      if (logger) logger.warn(`Failed to parse person details for ${personId}`);
      return { success: false, error: 'other', rawError: 'Parse error' };
    }

    return { success: true, attributes: result.data.attributes };
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = error_.message || String(error);
    if (message !== '' && (message.includes('403') || message.includes('Forbidden'))) {
      return { success: false, error: 'forbidden', rawError: message };
    }
    if (message.includes('404')) {
      return { success: false, error: 'not_found', rawError: message };
    }
    return { success: false, error: 'other', rawError: message };
  }
}

// Simple string similarity (case insensitive)
function areNamesSimilar(a: string, b: string): boolean {
  return (
    a.toLowerCase().trim() === b.toLowerCase().trim() ||
    a.toLowerCase().includes(b.toLowerCase()) ||
    b.toLowerCase().includes(a.toLowerCase())
  );
}

export function verifyUserData(
  userData: {
    firstName: string;
    lastName?: string;
    email: string;
    nickname?: string | undefined;
    birthDate?: string | undefined;
  },
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

  if (!areNamesSimilar(inputName, apiName)) {
    matchDetails.nameMatch = false;
    mismatches.push(`Name: expected "${inputName}", got "${apiName}"`);
  }

  if (
    userData.nickname &&
    apiData.nickname &&
    !areNamesSimilar(userData.nickname, apiData.nickname)
  ) {
    matchDetails.nicknameMatch = false;
    mismatches.push(`Nickname: expected "${userData.nickname}", got "${apiData.nickname}"`);
  }

  // Schema uses birthDate, API uses birthday.
  // userData might be RegistrationInput which has birthDate (optional)
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

  // Note: RegistrationInput doesn't have address/town in the provided schema file view earlier.
  // Ignoring address verification if not in input.

  return {
    verified: mismatches.length === 0,
    mismatches,
    matchDetails,
  };
}
