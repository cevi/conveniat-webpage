import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import type { Logger, RoleResource } from '@/features/registration_process/hitobito-api/types';

export interface GetPersonRolesParameters {
  personId: string;
  groupId: string;
}

export interface CheckActiveRoleParameters {
  personId: string;
  groupId: string;
}

export interface AddPersonToGroupParameters {
  personId: string;
  groupId: string;
  roleType: string;
  options?: {
    endOn?: string; // YYYY-MM-DD
    personName?: string;
  };
}

export interface RemoveRoleParameters {
  roleId: string;
}

export class GroupService {
  constructor(
    private readonly client: HitobitoClient,
    private readonly logger?: Logger,
  ) {}

  async getPersonRoles({ personId, groupId }: GetPersonRolesParameters): Promise<RoleResource[]> {
    const response = await this.client.apiRequest<{ data: RoleResource[] }>('GET', '/api/roles', {
      params: {
        'filter[person_id][eq]': personId,
        'filter[group_id][eq]': groupId,
      },
    });
    return response.data;
  }

  async checkActiveRole({
    personId,
    groupId,
  }: CheckActiveRoleParameters): Promise<string | undefined> {
    const roles = await this.getPersonRoles({ personId, groupId });
    const now = new Date().setHours(0, 0, 0, 0);

    for (const role of roles) {
      const endOn = role.attributes.end_on;
      const isActive =
        endOn === null ||
        endOn === undefined ||
        endOn === '' ||
        (typeof endOn === 'string' && new Date(endOn).getTime() >= now);

      if (isActive) return String(role.id);
    }
    return undefined;
  }

  async addPerson({
    personId,
    groupId,
    roleType,
    options = {},
  }: AddPersonToGroupParameters): Promise<boolean> {
    // 1. Check if already in group
    const existingId = await this.checkActiveRole({ personId, groupId });
    if (existingId !== undefined && existingId !== '') {
      this.logger?.info(`User ${personId} already has an active role in group ${groupId}`);
      return true;
    }

    const formPath = `/groups/${groupId}/roles/new`;
    try {
      // 2. Get Form
      const currentDate = new Date();
      const todayString = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;

      const formData: Record<string, string> = {
        'role[person_id]': personId,
        'role[person]': options.personName ?? '',
        'role[group_id]': groupId,
        'role[type]': roleType,
        'role[label]': '',
        'role[start_on]': todayString,
        'role[end_on]': options.endOn
          ? options.endOn.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1')
          : '',
        button: '',
        return_url: '',
      };

      // Add missing fields usually required by the form
      const missingFields = [
        'role[new_person][first_name]',
        'role[new_person][last_name]',
        'role[new_person][nickname]',
        'role[new_person][company_name]',
        'role[new_person][company]',
        'role[new_person][email]',
        'role[new_person][privacy_policy_accepted]',
      ];
      for (const field of missingFields) {
        if (field === 'role[new_person][company]') {
          formData[field] = '0';
        } else if (field === 'role[new_person][privacy_policy_accepted]') {
          formData[field] = '0';
        } else {
          formData[field] = '';
        }
      }

      const { response, body } = await this.client.submitRailsForm({
        getFormUrl: formPath,
        postUrl: `/groups/${groupId}/roles`,
        formData,
        extraHeaders: {
          Accept: 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml',
          'x-turbo-request-id': crypto.randomUUID(),
        },
      });

      if (response.status >= 400) {
        this.logger?.error(
          `Frontend returned ${response.status} ${response.statusText}. Body preview: ${body.slice(0, 500)}`,
        );
        throw new Error(`Frontend returned ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.logger?.warn(`addPerson failed for ${personId} in group ${groupId}: ${String(error)}`);
      throw error;
    }
  }

  async removeRole({ roleId }: RemoveRoleParameters): Promise<boolean> {
    await this.client.apiRequest('DELETE', `/api/roles/${roleId}`);
    return true;
  }
}
