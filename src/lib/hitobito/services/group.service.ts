import type { HitobitoClient } from '@/lib/hitobito/client';
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
  /** URL of the profile picture, or of Cevi.DB's placeholder; empty when missing */
  picture: string;
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
          picture: z.string().nullish(),
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
  constructor(private readonly client: HitobitoClient) {}

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
          picture: person.picture ?? '',
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
}
