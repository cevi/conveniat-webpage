import type { Timeline } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { draftMode } from 'next/headers';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches multiple timeline entries by their IDs in a single
 * batched query with request-level memoization.
 * Used to avoid N+1 issues in content blocks.
 */
export const getTimelineEntriesCached = cache(
  async (ids: string[], locale: Locale): Promise<{ docs: Timeline[] }> => {
    return await withSpan('getTimelineEntriesCached', async () => {
      if (ids.length === 0) return { docs: [] };

      const payload = await getPayload({ config });
      const draft = await draftMode();

      const result = await payload.find({
        collection: 'timeline',
        locale: locale,
        draft: draft.isEnabled,
        pagination: false,
        where: {
          and: [
            { id: { in: ids } },
            draft.isEnabled ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
      });

      return { docs: result.docs };
    });
  },
);
