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
        // Select only fields needed for frontend rendering.
        // Skipping admin-only relationship fields (authors, lastEditedByUser)
        // eliminates the users collection population cascade (~104ms).
        select: {
          _localized_status: true,
          internalPageName: true,
          content: true,
          seo: true,
        },
      });

      // deduplicate by id in case of internal payload cms duplicate bugs
      const uniqueDocuments = [
        ...new Map(result.docs.map((document_) => [document_.id, document_])).values(),
      ];

      // Cast is safe: selected fields cover everything the frontend rendering
      // path accesses (id, _locale, _localized_status, internalPageName, content, seo).
      return { docs: uniqueDocuments as unknown as GenericPage[] };
    });
  },
);

/**
 * Lightweight existence check for Generic Pages by slug.
 *
 * Uses `select` to skip the heavy `mainContent` blocks entirely while still
 * populating the `permissions` relationship (depth: 1). This avoids the N+1
 * cascade that occurs when the fallback logic sweeps all locales with full
 * document hydration.
 *
 * Returns only the fields needed for fallback resolution:
 * - `id` (always included)
 * - `_locale` (always included)
 * - `content.permissions` (populated via depth: 1)
 */
export const getGenericPageExistsBySlugCached = cache(
  async (
    slug: string,
    locale: Locale,
    draft: boolean = false,
  ): Promise<{ docs: GenericPage[] }> => {
    return await withSpan('getGenericPageExistsBySlugCached', async () => {
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
            draft ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
        select: {
          content: {
            permissions: true,
          },
        },
      });

      const uniqueDocuments = [
        ...new Map(result.docs.map((document_) => [document_.id, document_])).values(),
      ];

      // Cast is safe: selected fields are a subset of GenericPage, and
      // the fallback logic only accesses id, _locale, and content.permissions.
      return { docs: uniqueDocuments as unknown as GenericPage[] };
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

      // Cast is safe: selected fields cover everything the frontend rendering path accesses.
      return (await payload.findByID({
        collection: 'generic-page',
        depth: 1,
        id,
        locale,
        draft,
        // Same select as getGenericPageBySlugCached — skip admin-only fields.
        select: {
          _localized_status: true,
          internalPageName: true,
          content: true,
          seo: true,
        },
      })) as unknown as GenericPage;
    });
  },
);
