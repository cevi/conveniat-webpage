import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import { withSpan } from '@/utils/tracing-helpers';

/**
 * The slugs a CMS path can resolve to, in any locale this deployment serves.
 *
 * A Generic Page answers to its slug and to every slug it had before, which redirects to the
 * current one. A slug published in another locale only is kept as well, because the page route
 * redirects it to that locale.
 */
export interface PublishedPageSlugs {
  genericPages: Set<string>;
}

interface SeoSlugs {
  seo?: { urlSlug?: string | null; urlSlugHistory?: { slug?: string | null }[] | null };
}

/**
 * Reads the slugs of every published Generic Page, and nothing else of them.
 *
 * Payload is imported lazily: the proxy calls this, and its bundle should not load the CMS
 * config before the first request that needs it.
 */
export const fetchPublishedPageSlugs = async (): Promise<PublishedPageSlugs> => {
  return await withSpan('fetchPublishedPageSlugs', async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@payload-config'),
    ]);
    const payload = await getPayload({ config });

    const readSlugs = async (locale: LocaleCode): Promise<SeoSlugs[]> => {
      const result = await payload.find({
        collection: 'generic-page',
        locale,
        fallbackLocale: false,
        depth: 0,
        pagination: false,
        where: { _localized_status: { equals: { published: true } } },
        select: { seo: { urlSlug: true, urlSlugHistory: true } },
      });
      return result.docs;
    };

    const genericPages = new Set<string>();

    await Promise.all(
      enabledLocales.map((locale) =>
        readSlugs(locale).then((documents) => {
          for (const { seo } of documents) {
            if (typeof seo?.urlSlug === 'string') genericPages.add(seo.urlSlug);
            for (const { slug } of seo?.urlSlugHistory ?? []) {
              if (typeof slug === 'string') genericPages.add(slug);
            }
          }
        }),
      ),
    );

    return { genericPages };
  });
};

/**
 * The Redis key whose value changes whenever a save may have changed the published slugs. Every
 * replica compares it with the value it read its slugs under, so a change on one replica reaches
 * the proxies of all of them.
 */
const SLUGS_VERSION_KEY = 'published-page-slugs:version';

/** Announces that the published slugs may have changed. */
export const markPublishedPageSlugsChanged = async (): Promise<void> => {
  const { redis } = await import('@/lib/db/redis');
  await redis.incr(SLUGS_VERSION_KEY);
};

/** The version of the published slugs, `'0'` before the first change was announced. */
export const readPublishedPageSlugsVersion = async (): Promise<string> => {
  const { redis } = await import('@/lib/db/redis');
  return (await redis.get(SLUGS_VERSION_KEY)) ?? '0';
};
