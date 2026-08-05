import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

/**
 * Fetches Generic Pages by slug.
 * Uses Next.js 16.3 'use cache' for persistent and request-level deduplicated caching.
 * Supports both published and draft (preview) modes.
 */
export const getGenericPageBySlugCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

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
          ...(draft ? [] : [{ _localized_status: { equals: { published: true } } }]),
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
};

/**
 * Lightweight existence check for Generic Pages by slug.
 * Fetches ONLY content.permissions (skipping full layout depth:1 cascade).
 * Used during fallback resolution to test if a page exists without loading full content.
 */
export const getGenericPageExistsBySlugCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

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
          ...(draft ? [] : [{ _localized_status: { equals: { published: true } } }]),
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
};

/**
 * Fetches a Generic Page by ID.
 * Used for fallback logic when slug lookup fails in current locale.
 */
export const getGenericPageByIDCached = async (
  id: string,
  locale: Locale,
  draft: boolean = false,
): Promise<GenericPage> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `doc:generic-page:${id}`);

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
};

/**
 * Fetches a Generic Page by its slug history (previous slugs).
 * Used for fallback redirection when the current slug doesn't match any active page.
 */
export const getGenericPageBySlugHistoryCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await withSpan('getGenericPageBySlugHistoryCached', async () => {
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
          { 'seo.urlSlugHistory.slug': { equals: slug } },
          ...(draft ? [] : [{ _localized_status: { equals: { published: true } } }]),
        ],
      },
      select: {
        _localized_status: true,
        internalPageName: true,
        seo: true,
      },
    });

    const uniqueDocuments = [
      ...new Map(result.docs.map((document_) => [document_.id, document_])).values(),
    ];

    return { docs: uniqueDocuments as unknown as GenericPage[] };
  });
};

/**
 * Lightweight metadata-only fetch: seo + internalPageName only, no relationship population.
 * Used exclusively by generateMetadata to avoid the depth:1 cascade.
 */
export const getGenericPageMetadataBySlugCached = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await withSpan('getGenericPageMetadataBySlugCached', async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      depth: 0,
      collection: 'generic-page',
      pagination: false,
      locale,
      fallbackLocale: false,
      draft: false,
      where: {
        and: [
          { 'seo.urlSlug': { equals: slug } },
          { _localized_status: { equals: { published: true } } },
        ],
      },
      select: {
        seo: true,
        internalPageName: true,
      },
    });
    return { docs: result.docs as unknown as GenericPage[] };
  });
};

/**
 * Fetches all published locale variants of a page by internalPageName.
 */
export const getGenericPageAlternativesCached = async (
  internalPageName: string,
): Promise<GenericPage[]> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await withSpan('getGenericPageAlternativesCached', async () => {
    const payload = await getPayload({ config });
    const results = await Promise.all(
      i18nConfig.locales.map((loc) =>
        payload.find({
          depth: 0,
          collection: 'generic-page',
          pagination: false,
          locale: loc as Locale,
          fallbackLocale: false,
          draft: false,
          where: {
            and: [
              { internalPageName: { equals: internalPageName } },
              { _localized_status: { equals: { published: true } } },
            ],
          },
          select: {
            seo: true,
            _localized_status: true,
          },
        }),
      ),
    );
    return results.flatMap((r) => r.docs as unknown as GenericPage[]);
  });
};
