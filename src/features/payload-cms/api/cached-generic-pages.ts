import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

/**
 * Reads a Generic Page by slug straight from the CMS, with no caching layer.
 *
 * Every `draft` read goes through here. A draft read must never be served from the
 * persistent `'use cache'` layer: the live preview iframe has to show what the editor
 * just typed, and a `cacheLife('hours')` entry would keep serving the previous version
 * for up to an hour. `revalidateTag` from the afterChange hook only flushes the instance
 * that handled the write, so with more than one replica the stale entry can outlive it.
 */
const fetchGenericPageBySlug = async (
  slug: string,
  locale: Locale,
  draft: boolean,
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
 * Fetches published Generic Pages by slug.
 * Uses Next.js 16.3 'use cache' for persistent and request-level deduplicated caching.
 */
const getPublishedGenericPageBySlugCached = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await fetchGenericPageBySlug(slug, locale, false);
};

/**
 * Fetches Generic Pages by slug.
 * Published reads are cached persistently; draft (preview) reads bypass the cache.
 */
export const getGenericPageBySlugCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  return draft
    ? await fetchGenericPageBySlug(slug, locale, true)
    : await getPublishedGenericPageBySlugCached(slug, locale);
};

/**
 * Lightweight existence check for Generic Pages by slug, uncached.
 * Fetches ONLY content.permissions (skipping full layout depth:1 cascade).
 * Used during fallback resolution to test if a page exists without loading full content.
 */
const fetchGenericPageExistsBySlug = async (
  slug: string,
  locale: Locale,
  draft: boolean,
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
 * Cached existence check for published Generic Pages by slug.
 */
const getPublishedGenericPageExistsBySlugCached = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await fetchGenericPageExistsBySlug(slug, locale, false);
};

/**
 * Existence check for Generic Pages by slug.
 * Published reads are cached persistently; draft (preview) reads bypass the cache.
 */
export const getGenericPageExistsBySlugCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  return draft
    ? await fetchGenericPageExistsBySlug(slug, locale, true)
    : await getPublishedGenericPageExistsBySlugCached(slug, locale);
};

/**
 * Reads a Generic Page by ID straight from the CMS, with no caching layer.
 * Used for fallback logic when slug lookup fails in current locale.
 */
const fetchGenericPageByID = async (
  id: string,
  locale: Locale,
  draft: boolean,
): Promise<GenericPage> => {
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
 * Cached read of a published Generic Page by ID.
 */
const getPublishedGenericPageByIDCached = async (
  id: string,
  locale: Locale,
): Promise<GenericPage> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `doc:generic-page:${id}`);

  return await fetchGenericPageByID(id, locale, false);
};

/**
 * Fetches a Generic Page by ID.
 * Published reads are cached persistently; draft (preview) reads bypass the cache.
 */
export const getGenericPageByIDCached = async (
  id: string,
  locale: Locale,
  draft: boolean = false,
): Promise<GenericPage> => {
  return draft
    ? await fetchGenericPageByID(id, locale, true)
    : await getPublishedGenericPageByIDCached(id, locale);
};

/**
 * Reads a Generic Page by its slug history (previous slugs), with no caching layer.
 * Used for fallback redirection when the current slug doesn't match any active page.
 */
const fetchGenericPageBySlugHistory = async (
  slug: string,
  locale: Locale,
  draft: boolean,
): Promise<{ docs: GenericPage[] }> => {
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
 * Cached read of published Generic Pages by slug history.
 */
const getPublishedGenericPageBySlugHistoryCached = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPage[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return await fetchGenericPageBySlugHistory(slug, locale, false);
};

/**
 * Fetches a Generic Page by its slug history (previous slugs).
 * Published reads are cached persistently; draft (preview) reads bypass the cache.
 */
export const getGenericPageBySlugHistoryCached = async (
  slug: string,
  locale: Locale,
  draft: boolean = false,
): Promise<{ docs: GenericPage[] }> => {
  return draft
    ? await fetchGenericPageBySlugHistory(slug, locale, true)
    : await getPublishedGenericPageBySlugHistoryCached(slug, locale);
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
