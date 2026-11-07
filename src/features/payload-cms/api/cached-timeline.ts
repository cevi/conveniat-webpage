import type { Timeline } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches every timeline entry in any of the given categories, in one query with
 * request-level memoization.
 *
 * Reads by category rather than through the category's `relatedTimelineEntries` join,
 * because a join returns only its first page of ten documents.
 *
 * @param categoryIds - The timeline categories whose entries to read.
 * @param draft - Whether to fetch draft versions. Passed by the caller
 *   rather than reading draftMode() internally, so this function does
 *   not implicitly bust the Next.js cache.
 */
export const getTimelineEntriesCached = cache(
  async (
    categoryIds: string[],
    locale: Locale,
    draft: boolean = false,
  ): Promise<{ docs: Timeline[] }> => {
    return await withSpan('getTimelineEntriesCached', async () => {
      if (categoryIds.length === 0) return { docs: [] };

      const payload = await getPayload({ config });

      const result = await payload.find({
        collection: 'timeline',
        locale: locale,
        draft: draft,
        pagination: false,
        where: {
          and: [
            { categories: { in: categoryIds } },
            draft ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
      });

      return { docs: result.docs };
    });
  },
);
