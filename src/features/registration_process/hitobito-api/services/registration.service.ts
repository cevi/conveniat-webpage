import type { Hitobito } from '@/features/registration_process/hitobito-api/index';
import type { Logger } from '@/features/registration_process/hitobito-api/types';

export interface CreateRegistrationParameters {
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    nickname?: string | undefined;
  };
  groupId: string;
}

export class RegistrationService {
  constructor(
    private readonly hitobito: Hitobito,
    private readonly logger?: Logger,
  ) {}

  async createUserSelfRegistration({
    userData,
    groupId,
  }: CreateRegistrationParameters): Promise<string | undefined> {
    const url = `/api/groups/${groupId}/self_registrations`;

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
      const response = await this.hitobito.client.apiRequest<{ data: { id: string } }>(
        'POST',
        url,
        { body: payload },
      );
      return response.data.id;
    } catch (error) {
      if (String(error).includes('422')) {
        this.logger?.warn(`createUserSelfRegistration 422 (likely exists)`);
        return undefined;
      }
      throw error;
    }
  }
}
