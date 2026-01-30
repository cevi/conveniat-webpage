import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches Generic Pages by slug with request-level memoization.
 * Supports both published and draft (preview) modes.
 */
export const getGenericPageBySlugCached = cache(
  async (
    slug: string,
    locale: Locale,
    draft: boolean = false,
  ): Promise<{ docs: GenericPage[] }> => {
    return await withSpan('getGenericPageBySlugCached', async () => {
      const payload = await getPayload({ config });

      const result = await payload.find({
        depth: 1,
        collection: 'generic-page',
        pagination: false,
        locale: locale,
        fallbackLocale: false,
        draft: draft,
        where: {
          and: [
            { 'seo.urlSlug': { equals: slug } },
            // we only resolve published pages unless in preview mode
            draft ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
      });

      return { docs: result.docs };
    });
  },
);

/**
 * Fetches a Generic Page by ID with request-level memoization.
 * Used for fallback logic when slug lookup fails in current locale.
 */
export const getGenericPageByIDCached = cache(
  async (id: string, locale: Locale, draft: boolean = false): Promise<GenericPage> => {
    return await withSpan('getGenericPageByIDCached', async () => {
      const payload = await getPayload({ config });

      return payload.findByID({
        collection: 'generic-page',
        depth: 1,
        id,
        locale,
        draft,
      });
    });
  },
);
