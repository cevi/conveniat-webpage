import type { HitobitoClient } from '@/lib/hitobito/client';
import { PersonResourceSchema } from '@/lib/hitobito/schemas';
import type { Logger, PersonAttributes, PersonResource } from '@/lib/hitobito/types';

export interface GetPersonDetailsParameters {
  personId: string;
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

      this.logger?.error(
        `Schema validation failed for person ${personId}: ${result.error.message}`,
      );
      throw new Error(`Schema validation failed for person ${personId}: ${result.error.message}`);
    } catch (error) {
      const message = String(error);
      if (message.includes('403')) return { success: false, error: 'forbidden' };
      if (message.includes('404')) return { success: false, error: 'not_found' };
      throw error;
    }
  }
}
