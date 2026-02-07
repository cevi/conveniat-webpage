import type { Logger } from '@/features/registration_process/hitobito-api/client';
import { apiPost } from '@/features/registration_process/hitobito-api/client';

export async function createUserSelfRegistration(
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    nickname?: string | undefined;
  },
  groupId: string,
  logger?: Logger,
): Promise<string | undefined> {
  const url = `/api/groups/${groupId}/self_registrations`;

  // NOTE: RegistrationInput schema does not have company/consent/policy fields shown in prototype.
  // I will only send what we have.
  const payload = {
    data: {
      type: 'self_registrations',
      attributes: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        nickname: userData.nickname,
        email: userData.email,
        adult_consent: true,
        privacy_policy_accepted: true,
      },
    },
  };

  try {
    const response = await apiPost<{ data?: { id?: string } }>(url, payload, logger);
    return response.data?.id ?? undefined;
  } catch (error) {
    if (String(error).includes('422')) {
      if (logger) logger.warn(`createUserSelfRegistration 422 (likely exists)`);
      return undefined;
    }
    throw error;
  }
}
