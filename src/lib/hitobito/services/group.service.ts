import type { HitobitoClient } from '@/lib/hitobito/client';
import type { Logger, RoleResource } from '@/lib/hitobito/types';
import { z } from 'zod';

/** A group as the JSON:API lists it. */
export interface GroupSummary {
  id: string;
  name: string;
}

interface GroupListResponse {
  data?: Array<{ id?: string; attributes?: { name?: string } }>;
  links?: { next?: string | null };
}

/** Somebody holding a role in a group, as `people.json` lists them. */
export interface GroupRoleHolder {
  personId: string;
  /** trimmed and lower-cased, empty when Cevi.DB has none */
  email: string;
  /** as Cevi.DB stores them, still HTML-encoded; empty when missing */
  firstName: string;
  lastName: string;
  nickname: string;
}

/**
 * The legacy `people.json` payload, read defensively: it is a frontend endpoint, so a
 * person without an e-mail, without roles or with an unexpected extra key is normal and
 * must not lose us the rest of the list.
 */
const PeopleJsonSchema = z.object({
  /** Hitobito pages long lists; absent or empty on the last page. */
  next_page_link: z.string().nullish(),
  people: z
    .array(
      z
        .object({
          id: z.union([z.string(), z.number()]).nullish(),
          email: z.string().nullish(),
          first_name: z.string().nullish(),
          last_name: z.string().nullish(),
          nickname: z.string().nullish(),
          links: z
            .object({ roles: z.array(z.union([z.string(), z.number()])).nullish() })
            .nullish(),
        })
        .passthrough(),
    )
    .nullish(),
  linked: z
    .object({
      roles: z
        .array(
          z
            .object({
              id: z.union([z.string(), z.number()]),
              role_class: z.string().nullish(),
            })
            .passthrough()
            .nullable(),
        )
        .nullish(),
    })
    .nullish(),
});

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

/** A safety stop for `people.json`, far above any real group. */
const MAX_PEOPLE_PAGES = 100;

/** Cevi.DB group ids are plain numbers. */
const GROUP_ID = /^\d+$/;

/**
 * Checks a group id before it becomes part of a path. The ids come from Cevi.DB's own answers
 * and from configuration, and a `../` in one would point an authenticated request elsewhere.
 */
const assertGroupId = (groupId: string): void => {
  if (!GROUP_ID.test(groupId)) {
    throw new Error(`Not a Cevi.DB group id: ${JSON.stringify(groupId)}`);
  }
};

export class GroupService {
  constructor(
    private readonly client: HitobitoClient,
    private readonly logger?: Logger,
  ) {}

  /** The name of one group, empty when Cevi.DB has none. */
  async getGroupName(groupId: string): Promise<string> {
    assertGroupId(groupId);
    const response = await this.client.apiRequest<{ data?: { attributes?: { name?: string } } }>(
      'GET',
      `/api/groups/${groupId}`,
    );
    return response.data?.attributes?.name ?? '';
  }

  /** The groups directly below a group, every page of them. */
  async listSubgroups(parentGroupId: string): Promise<GroupSummary[]> {
    assertGroupId(parentGroupId);
    const subgroups: GroupSummary[] = [];
    let nextUrl: string | undefined = '/api/groups';
    let isFirstPage = true;

    while (typeof nextUrl === 'string' && nextUrl !== '') {
      const response: GroupListResponse = await this.client.apiRequest<GroupListResponse>(
        'GET',
        nextUrl,
        isFirstPage
          ? { params: { 'filter[parent_id][eq]': parentGroupId, 'page[size]': '100' } }
          : {},
      );
      for (const group of response.data ?? []) {
        if (typeof group.id !== 'string') continue;
        assertGroupId(group.id);
        subgroups.push({ id: group.id, name: group.attributes?.name ?? '' });
      }
      nextUrl = response.links?.next ?? undefined;
      isFirstPage = false;
    }
    return subgroups;
  }

  /**
   * The people holding a role of the given class in a group itself, not in its subgroups.
   * Reads the legacy `people.json`, the only list that carries the role classes.
   */
  async listPeopleWithRole(groupId: string, roleClass: string): Promise<GroupRoleHolder[]> {
    assertGroupId(groupId);
    const holders: GroupRoleHolder[] = [];
    let nextPage: string | undefined = `/groups/${groupId}/people.json`;
    for (let page = 0; nextPage !== undefined; page += 1) {
      if (page >= MAX_PEOPLE_PAGES) {
        throw new Error(`The people of group ${groupId} span more than ${MAX_PEOPLE_PAGES} pages`);
      }
      const parsed = await this.fetchPeoplePage(groupId, nextPage);

      // every page links the roles of its own people
      const roleIds = new Set(
        (parsed.linked?.roles ?? [])
          .filter((role) => role !== null && role.role_class === roleClass)
          .map((role) => String(role?.id)),
      );
      for (const person of parsed.people ?? []) {
        if (!(person.links?.roles ?? []).some((roleId) => roleIds.has(String(roleId)))) continue;
        holders.push({
          personId: person.id === null || person.id === undefined ? '' : String(person.id),
          email: (person.email ?? '').trim().toLowerCase(),
          firstName: person.first_name ?? '',
          lastName: person.last_name ?? '',
          nickname: person.nickname ?? '',
        });
      }

      const link = parsed.next_page_link ?? '';
      nextPage = link === '' ? undefined : link;
    }
    return holders;
  }

  /** One page of `people.json`; the client refuses a next-page link on another origin. */
  private async fetchPeoplePage(
    groupId: string,
    pathOrUrl: string,
  ): Promise<z.infer<typeof PeopleJsonSchema>> {
    const { response, body } = await this.client.frontendRequest('GET', pathOrUrl, {
      headers: {
        ...this.client.getFrontendHeaders(),
        'X-Token': this.client.config.apiToken,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch the people of group ${groupId}: status ${String(response.status)}`,
      );
    }

    // An answer of another shape is an error, not an empty group: read as "nobody holds the
    // role", it would take a function or a reminder recipient away from everyone.
    const parsed = PeopleJsonSchema.safeParse(JSON.parse(body));
    if (!parsed.success) {
      throw new Error(`Cevi.DB answered the people of group ${groupId} in an unexpected shape`);
    }
    return parsed.data;
  }

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
        'role[end_on]':
          options.endOn !== undefined && options.endOn !== ''
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
          formData[field] = '1'; // Changed from '0' to '1' to avoid error
        } else {
          formData[field] = '';
        }
      }

      const { response, body } = await this.client.submitRailsForm({
        getFormUrl: formPath,
        postUrl: `/groups/${groupId}/roles`,
        formData,
        extractExtraFields: true,
      });

      if (response.status >= 400) {
        // Try to extract exact validation errors from the returned HTML to ease debugging
        const validationErrors = [...body.matchAll(/class="invalid-feedback"[^>]*>(.*?)<\/div>/gs)]
          .map((m) => m[1]?.trim().replaceAll(/(<([^>]+)>)/gi, ''))
          .filter(Boolean);

        const details =
          validationErrors.length > 0 ? ` Validation errors: ${validationErrors.join(', ')}` : '';

        this.logger?.error(
          `Frontend returned ${response.status} ${response.statusText}.${details} Body preview: ${body.slice(0, 300)}`,
        );
        throw new Error(`Frontend returned ${response.status} ${response.statusText}.${details}`);
      }

      const { extractPendingApprovalGroup } = await import('@/lib/hitobito/html-parser');
      const pendingApproval = extractPendingApprovalGroup(body);

      if (pendingApproval !== undefined) {
        this.logger?.info(
          `Detected pending manual approval for user ${personId} in group ${pendingApproval.groupName}`,
        );
        const { ApprovalRequiredError } = await import('@/lib/hitobito/errors');
        throw new ApprovalRequiredError(
          `Manual approval required.`,
          pendingApproval.groupName,
          pendingApproval.groupUrl,
        );
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
