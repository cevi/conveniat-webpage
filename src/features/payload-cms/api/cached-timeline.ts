import type { Timeline } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches multiple timeline entries by their IDs in a single
 * batched query with request-level memoization.
 * Used to avoid N+1 issues in content blocks.
 */
export const getTimelineEntriesCached = cache(
  async (ids: string[], locale: Locale): Promise<{ docs: Timeline[] }> => {
    if (ids.length === 0) return { docs: [] };

    const payload = await getPayload({ config });
    const now = new Date();

    const result = await payload.find({
      collection: 'timeline',
      locale: locale,
      pagination: false,
      where: {
        and: [
          { id: { in: ids } },
          { _localized_status: { equals: { published: true } } },
          { date: { less_than_equal: now } },
        ],
      },
    });

    return { docs: result.docs };
  },
);
