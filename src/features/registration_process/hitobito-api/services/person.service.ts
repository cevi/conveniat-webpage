import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import {
  PersonResourceSchema,
  SearchResponseSchema,
} from '@/features/registration_process/hitobito-api/schemas';
import type {
  Logger,
  PersonAttributes,
  PersonResource,
  SearchCandidate,
} from '@/features/registration_process/hitobito-api/types';

export interface GetPersonDetailsParameters {
  personId: string;
}

export interface SearchPersonParameters {
  query: string;
}

export interface LookupByEmailParameters {
  email: string;
}

export class PersonService {
  constructor(
    private readonly client: HitobitoClient,
    private readonly logger?: Logger,
  ) {}

  async getDetails({ personId }: GetPersonDetailsParameters): Promise<{
    success: boolean;
    attributes?: PersonAttributes;
    error?: 'forbidden' | 'not_found' | 'other';
  }> {
    try {
      const response = await this.client.apiRequest<{ data: PersonResource }>(
        'GET',
        `/api/people/${personId}`,
      );
      const result = PersonResourceSchema.safeParse(response.data);

      if (result.success) {
        return { success: true, attributes: result.data.attributes };
      }

      this.logger?.error(`Schema validation failed for person ${personId}`, result.error);
      throw new Error(`Schema validation failed for person ${personId}: ${result.error.message}`);
    } catch (error) {
      const message = String(error);
      if (message.includes('403')) return { success: false, error: 'forbidden' };
      if (message.includes('404')) return { success: false, error: 'not_found' };
      throw error;
    }
  }

  async search({ query }: SearchPersonParameters): Promise<SearchCandidate[]> {
    const path = '/full.json';
    const { response, body } = await this.client.frontendRequest('GET', path, {
      params: { q: query },
    });

    if (!response.ok) {
      throw new Error(`Person search failed with status ${response.status} at ${path}`);
    }

    const json = JSON.parse(body) as unknown;
    const parseResult = SearchResponseSchema.safeParse(json);
    if (!parseResult.success) {
      this.logger?.warn('searchUser failed to validate response schema', parseResult.error);
      throw new Error(
        `searchUser failed to validate response schema: ${parseResult.error.message}`,
      );
    }

    const data = parseResult.data;
    if (Array.isArray(data)) return data;
    if ('results' in data && data.results) return data.results;
    if ('people' in data && data.people) return data.people;

    return [];
  }

  async lookupByEmail({
    email,
  }: LookupByEmailParameters): Promise<{ id: string; label: string } | undefined> {
    const response = await this.client.apiRequest<{ data: PersonResource[] }>(
      'GET',
      '/api/people',
      {
        params: { 'filter[email]': email },
      },
    );

    if (response.data.length > 0) {
      const result = PersonResourceSchema.safeParse(response.data[0]);
      if (result.success) {
        const person = result.data;
        const label =
          `${person.attributes.first_name ?? ''} ${person.attributes.last_name ?? ''}`.trim();
        return { id: person.id, label };
      }
      this.logger?.warn(
        `lookupByEmail failed to validate response schema for ${email}`,
        result.error,
      );
      throw new Error(`lookupByEmail failed to validate response schema: ${result.error.message}`);
    }
    return undefined;
  }
}
