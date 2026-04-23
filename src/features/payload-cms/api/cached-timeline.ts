import type { Timeline } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches multiple timeline entries by their IDs in a single
 * batched query with request-level memoization.
 * Used to avoid N+1 issues in content blocks.
 *
 * @param draft - Whether to fetch draft versions. Passed by the caller
 *   rather than reading draftMode() internally, so this function does
 *   not implicitly bust the Next.js cache.
 */
export const getTimelineEntriesCached = cache(
  async (ids: string[], locale: Locale, draft: boolean = false): Promise<{ docs: Timeline[] }> => {
    return await withSpan('getTimelineEntriesCached', async () => {
      if (ids.length === 0) return { docs: [] };

      const payload = await getPayload({ config });

      const result = await payload.find({
        collection: 'timeline',
        locale: locale,
        draft: draft,
        pagination: false,
        where: {
          and: [
            { id: { in: ids } },
            draft ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
      });

      return { docs: result.docs };
    });
  },
);
