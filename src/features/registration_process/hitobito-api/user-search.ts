import type { Logger } from '@/features/registration_process/hitobito-api/client';
import { apiGet, httpGet } from '@/features/registration_process/hitobito-api/client';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import {
  PersonResourceSchema,
  SearchResponseSchema,
} from '@/features/registration_process/hitobito-api/schemas';

export interface SearchResult {
  id: string;
  label: string;
  email?: string | undefined;
}

function extractEmailFromLabel(label: string): string | undefined {
  const emailMatch = label.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch?.[0];
}

/**
 * Search for users using the frontend full.json endpoint for richer results
 */
export async function searchUser(query: string, logger?: Logger): Promise<SearchResult[]> {
  const url = `${HITOBITO_CONFIG.frontendUrl}/full.json?q=${encodeURIComponent(query)}`;

  if (logger) logger.info(`Searching user via ${url}`);

  try {
    const { response, body } = await httpGet(url, {
      cookies: HITOBITO_CONFIG.browserCookie,
    });

    if (!response.ok) {
      if (logger) logger.warn(`searchUser failed with status ${response.status}`);
      return [];
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      if (logger) logger.warn(`searchUser failed to parse JSON`);
      return [];
    }

    const parseResult = SearchResponseSchema.safeParse(json);
    if (!parseResult.success) {
      if (logger) logger.warn('searchUser failed to validate response schema', parseResult.error);
      return [];
    }

    let items: Array<{ id: string; label?: string | undefined; text?: string | undefined }> = [];
    const data = parseResult.data;

    if (Array.isArray(data)) {
      items = data;
    } else if ('results' in data && data.results !== undefined) {
      items = data.results;
    } else if ('people' in data && data.people !== undefined) {
      items = data.people;
    }

    return items.map((item) => ({
      id: item.id,
      label: item.label ?? item.text ?? '',
      email: extractEmailFromLabel(item.label ?? item.text ?? ''),
    }));
  } catch (error) {
    if (logger) logger.warn(`searchUser error: ${String(error)}`);
    return [];
  }
}

export async function lookupByEmail(
  email: string,
  logger?: Logger,
): Promise<{ personId: string | undefined; personLabel: string | undefined }> {
  try {
    const response = await apiGet<{ data: unknown[] }>(
      '/api/people',
      { 'filter[email]': email },
      undefined,
      logger,
    );

    if (response.data.length > 0) {
      const result = PersonResourceSchema.safeParse(response.data[0]);
      if (result.success) {
        const person = result.data;
        const label =
          `${person.attributes.first_name ?? ''} ${person.attributes.last_name ?? ''}`.trim();
        return { personId: person.id, personLabel: label };
      }
    }
    return { personId: undefined, personLabel: undefined };
  } catch (error) {
    if (logger) logger.warn(`lookupByEmail error: ${String(error)}`);
    return { personId: undefined, personLabel: undefined };
  }
}
