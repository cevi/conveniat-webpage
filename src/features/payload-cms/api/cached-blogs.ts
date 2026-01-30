import type { Blog } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches recent blog posts with request-level memoization.
 * Only returns published posts from the past.
 */
export const getRecentBlogPostsCached = cache(
  async (locale: Locale, limit?: number): Promise<{ docs: Blog[] }> => {
    const payload = await getPayload({ config });
    const currentDate = new Date().toISOString();

    const result = await payload.find({
      collection: 'blog',
      where: {
        and: [
          {
            _localized_status: {
              equals: {
                published: true,
              },
            },
          },
          {
            'content.releaseDate': {
              less_than_equal: currentDate,
            },
          },
        ],
      },
      locale: locale,
      limit: limit ?? 5,
    });

    return { docs: result.docs };
  },
);

/**
 * Fetches blog posts by slug with request-level memoization.
 */
export const getBlogArticleBySlugCached = cache(
  async (slug: string, locale: Locale, draft: boolean = false): Promise<{ docs: Blog[] }> => {
    const payload = await getPayload({ config });
    const currentDate = new Date().toISOString();

    const result = await payload.find({
      collection: 'blog',
      pagination: false,
      locale: locale,
      fallbackLocale: false,
      draft: draft,
      where: {
        and: [
          { 'seo.urlSlug': { equals: slug } },
          // we only resolve published pages unless in preview mode
          draft ? {} : { _localized_status: { equals: { published: true } } },
          draft
            ? {}
            : {
                'content.releaseDate': {
                  less_than_equal: currentDate,
                },
              },
        ],
      },
    });

    return { docs: result.docs };
  },
);
