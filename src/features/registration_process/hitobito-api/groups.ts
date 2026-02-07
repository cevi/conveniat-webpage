import type { Logger } from '@/features/registration_process/hitobito-api/client';
import {
  apiDelete,
  apiGet,
  apiPatch,
  getFrontendHeaders,
  httpGet,
  httpPost,
} from '@/features/registration_process/hitobito-api/client';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import {
  extractAuthenticityToken,
  extractCsrfMetaToken,
} from '@/features/registration_process/hitobito-api/html-parser';

export interface RoleAttributes {
  group_id: number | string;
  event_id?: number | string | null;
  type: string;
  label?: string | null;
  end_on?: string | null;
  [key: string]: unknown;
}

export interface RoleResource {
  id: string | number;
  type: string;
  attributes: RoleAttributes;
}

export async function getPersonGroupRoles(
  personId: string,
  groupId: string,
  logger?: Logger,
): Promise<RoleResource[]> {
  try {
    const response = await apiGet<{ data: RoleResource[] }>('/api/roles', {
      'filter[person_id][eq]': personId,
      'filter[group_id][eq]': groupId,
    });

    return response.data;
  } catch (error) {
    if (logger) logger.warn(`getPersonGroupRoles failed: ${String(error)}`, error);
    return [];
  }
}

export async function checkGroupRoleApi(
  personId: string,
  groupId: string,
  logger?: Logger,
): Promise<string | undefined> {
  try {
    const response = await apiGet<{ data: RoleResource[] }>(
      '/api/roles',
      {
        'filter[person_id][eq]': personId,
        'filter[group_id][eq]': groupId,
      },
      undefined,
      logger,
    );

    if (response.data.length === 0) return undefined;

    for (const role of response.data) {
      // Check if active
      const endOn = role.attributes.end_on;
      const isActive =
        endOn === undefined ||
        endOn === null ||
        endOn === '' ||
        (typeof endOn === 'string' && new Date(endOn) >= new Date(new Date().setHours(0, 0, 0, 0)));
      if (isActive) return String(role.id);
    }
    return undefined;
  } catch (error) {
    if (logger) logger.warn(`checkGroupRoleApi failed: ${String(error)}`, error);
    return undefined;
  }
}

/**
 * Robustly find a participation ID (Role ID) for a person in an event using the JSON API.
 * This is more reliable than scraping and avoids name-matching issues.
 */
export async function findParticipationIdViaApi(
  personId: string,
  eventId: string,
  logger?: Logger,
): Promise<string | undefined> {
  const targetEventId = String(eventId);

  // Strategy 1: Direct role search with filters (usually most specific and performant)
  try {
    const rolesResponse = await apiGet<{ data: RoleResource[] }>(
      '/api/roles',
      {
        'filter[person_id][eq]': personId,
        'filter[group_id][eq]': targetEventId,
      },
      undefined,
      logger,
    );

    if (rolesResponse.data.length > 0) {
      // Find active if possible, otherwise take the first
      const activeRole = rolesResponse.data.find((role) => {
        const endOn = role.attributes.end_on;
        return (
          endOn === undefined ||
          endOn === null ||
          endOn === '' ||
          (typeof endOn === 'string' &&
            new Date(endOn) >= new Date(new Date().setHours(0, 0, 0, 0)))
        );
      });
      const role = activeRole ?? rolesResponse.data[0];
      if (role && logger)
        logger.info(
          `[Workflow] Found participation ID ${role.id} for person ${personId} in event ${eventId} via direct API filter`,
        );
      return role ? String(role.id) : undefined;
    }
  } catch (error) {
    if (logger) logger.warn(`Direct API check failed: ${String(error)}`);
  }

  // Strategy 2: Fetch person with roles included (fallback)
  try {
    const response = await apiGet<{ data: unknown; included?: RoleResource[] }>(
      `/api/people/${personId}`,
      { include: 'roles' },
      undefined,
      logger,
    );

    if (logger) {
      const debugRoles = (response.included ?? [])
        .filter((r) => r.type === 'roles')
        .map((resource) => {
          const attributes = resource.attributes;
          const context = Object.entries(attributes)
            .filter(([key]) => ['group_id', 'event_id', 'type', 'label'].includes(key))
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(', ');
          return `Role ${resource.id} (${context})`;
        })
        .join(' | ');
      if (debugRoles !== '') logger.info(`[Debug] Person ${personId} roles: ${debugRoles}`);
    }

    if (response.included && Array.isArray(response.included)) {
      const participationRole = response.included.find((resource) => {
        if (resource.type !== 'roles') return false;
        const gid = String(resource.attributes.group_id);
        const eid = resource.attributes.event_id ? String(resource.attributes.event_id) : undefined;
        return gid === targetEventId || (eid !== undefined && eid === targetEventId);
      });

      if (participationRole) {
        if (logger)
          logger.info(
            `[Workflow] Found participation ID ${participationRole.id} for person ${personId} in event ${eventId} via Person API include`,
          );
        return String(participationRole.id);
      }
    }

    if (logger)
      logger.info(`No participation found via API for person ${personId} in event ${eventId}`);
    return undefined;
  } catch (error) {
    if (logger) logger.warn(`findParticipationIdViaApi failed: ${String(error)}`);
    return undefined;
  }
}

export async function addPersonToGroup(
  personId: string,
  groupId: string,
  roleType: string,
  roleEndOn: string | undefined, // YYYY-MM-DD
  logger?: Logger,
  personName?: string,
): Promise<boolean> {
  // 1. Check existence
  const existingId = await checkGroupRoleApi(personId, groupId, logger);
  if (existingId !== undefined) {
    if (logger) logger.info(`User ${personId} already in group ${groupId}`);
    return true;
  }

  const frontendUrl = HITOBITO_CONFIG.frontendUrl;
  const formUrl = `${frontendUrl}/groups/${groupId}/roles/new`;
  const cookie = HITOBITO_CONFIG.browserCookie;

  try {
    // 2. Get Form
    const { body: formHtml } = await httpGet(formUrl, {
      cookies: cookie,
      headers: getFrontendHeaders(),
    });

    const token = extractAuthenticityToken(formHtml);
    const metaToken = extractCsrfMetaToken(formHtml);

    const currentDate = new Date();
    const todayString = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;

    // 3. Post Form
    const formData = new URLSearchParams();
    formData.append('authenticity_token', token);
    formData.append('return_url', '');
    formData.append('role[person_id]', personId);
    formData.append('role[person]', personName ?? '');
    formData.append('role[new_person][first_name]', '');
    formData.append('role[new_person][last_name]', '');
    formData.append('role[new_person][nickname]', '');
    formData.append('role[new_person][company_name]', '');
    formData.append('role[new_person][company]', '0');
    formData.append('role[new_person][email]', '');
    formData.append('role[new_person][privacy_policy_accepted]', '0');

    formData.append('role[group_id]', groupId);
    formData.append('role[type]', roleType);
    formData.append('role[label]', '');
    formData.append('role[start_on]', todayString);
    formData.append('role[end_on]', roleEndOn ?? '');
    formData.append('button', '');

    const rawBody = formData.toString();

    const postUrl = `${frontendUrl}/groups/${groupId}/roles`;

    // Explicitly cast to Record<string, string> or similar to avoid 'any' if generic HeadersInit is not enough,
    // but getFrontendHeaders returns HeadersInit which is standard.
    // We need to extend it.
    const baseHeaders = getFrontendHeaders(formUrl) as Record<string, string>;
    const headers: Record<string, string> = {
      ...baseHeaders,
      Accept: 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml',
      'x-csrf-token': metaToken,
      'x-turbo-request-id': crypto.randomUUID(),
    };

    const { response } = await httpPost(postUrl, {
      cookies: cookie,
      headers,
      body: rawBody,
    });

    if (response.status >= 400) {
      const errorMessage = `Frontend returned ${response.status} ${response.statusText}`;
      if (logger)
        logger.warn(`addPersonToGroup failed with status ${response.status}: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    if (logger) logger.warn(`addPersonToGroup failed`, error);
    throw error;
  }
}

export async function removeGroupRole(
  personId: string,
  groupId: string,
  logger?: Logger,
): Promise<boolean> {
  try {
    const roles = await getPersonGroupRoles(personId, groupId, logger);
    const activeRoles = roles.filter((role) => {
      const endOn = role.attributes.end_on;
      return (
        endOn === undefined ||
        endOn === null ||
        endOn === '' ||
        (typeof endOn === 'string' && new Date(endOn) >= new Date(new Date().setHours(0, 0, 0, 0)))
      );
    });

    if (activeRoles.length === 0) {
      if (logger) logger.info(`User ${personId} not in group ${groupId}, nothing to remove.`);
      return true;
    }

    if (logger)
      logger.info(
        `Removing ${activeRoles.length} role(s) for User ${personId} from Group ${groupId}`,
      );

    for (const role of activeRoles) {
      if (logger) logger.info(`Removing role ${role.id}`);
      await apiDelete(`/api/roles/${role.id}`, logger);
    }
    return true;
  } catch (error) {
    if (logger) logger.warn(`removeGroupRole failed: ${String(error)}`);
    return false;
  }
}

export async function patchRole(
  roleId: string,
  attributes: Partial<RoleAttributes>,
  logger?: Logger,
): Promise<boolean> {
  const url = `/api/roles/${roleId}`;
  const payload = {
    data: {
      type: 'roles',
      id: roleId,
      attributes,
    },
  };

  try {
    await apiPatch(url, payload, logger);
    return true;
  } catch (error) {
    if (logger) logger.warn(`patchRole failed for role ${roleId}`, error);
    return false;
  }
}
