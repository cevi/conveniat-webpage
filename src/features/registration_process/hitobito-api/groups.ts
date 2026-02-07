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

interface RoleAttributes {
  group_id: number | string;
  end_on?: string | null;
  [key: string]: unknown;
}

interface RoleResource {
  id: string | number;
  attributes: RoleAttributes;
}

export async function checkGroupRoleApi(
  personId: string,
  groupId: string,
  logger?: Logger,
): Promise<string | undefined> {
  try {
    const response = await apiGet<{ data: RoleResource[] }>(
      '/roles',
      { 'filter[person_id]': personId },
      undefined,
      logger,
    );

    if (response.data.length === 0) return undefined;

    for (const role of response.data) {
      if (String(role.attributes.group_id) === String(groupId)) {
        // Check if active
        const endOn = role.attributes.end_on;
        const isActive = !endOn || new Date(endOn) >= new Date(new Date().setHours(0, 0, 0, 0));
        if (isActive) return String(role.id);
      }
    }
    return undefined;
  } catch (error) {
    if (logger) logger.warn(`checkGroupRoleApi failed`, error);
    return undefined;
  }
}

export async function addPersonToGroup(
  personId: string,
  groupId: string,
  roleType: string,
  roleEndOn: string | undefined, // YYYY-MM-DD
  logger?: Logger,
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
      throw new Error(`Frontend returned ${response.status}`);
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
    const roleId = await checkGroupRoleApi(personId, groupId, logger);
    if (roleId === undefined) {
      if (logger) logger.info(`User ${personId} not in group ${groupId}, nothing to remove.`);
      return true;
    }

    if (logger) logger.info(`Removing role ${roleId} (User ${personId}, Group ${groupId})`);
    await apiDelete(`/api/roles/${roleId}`, logger);
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
