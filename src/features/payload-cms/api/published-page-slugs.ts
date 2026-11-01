import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import { isPermissionPublic } from '@/utils/has-permissions';
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
  /**
   * The permission of every page that is not public, by `{locale}/{slug}`. Only the current slug
   * in its own locale is listed: that is the one the page route answers with 401 or 403, an old
   * slug or another locale redirects.
   */
  restrictedPages: Map<string, Permission>;
}

interface SlugsAndPermission {
  seo?: { urlSlug?: string | null; urlSlugHistory?: { slug?: string | null }[] | null };
  content?: { permissions?: string | Permission | null };
}

/** The key of a page in {@link PublishedPageSlugs.restrictedPages}. */
export const restrictedPageKey = (locale: string, slug: string): string => `${locale}/${slug}`;

/**
 * Reads the slugs and the permission of every published Generic Page, and nothing else of them.
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

    // depth 1 populates the permission as the page route reads it
    const readSlugs = async (locale: LocaleCode): Promise<SlugsAndPermission[]> => {
      const result = await payload.find({
        collection: 'generic-page',
        locale,
        fallbackLocale: false,
        depth: 1,
        pagination: false,
        where: { _localized_status: { equals: { published: true } } },
        select: { seo: { urlSlug: true, urlSlugHistory: true }, content: { permissions: true } },
      });
      return result.docs;
    };

    const genericPages = new Set<string>();
    const restrictedPages = new Map<string, Permission>();

    await Promise.all(
      enabledLocales.map((locale) =>
        readSlugs(locale).then((documents) => {
          for (const { seo, content } of documents) {
            const permission = content?.permissions;
            if (typeof seo?.urlSlug === 'string') {
              genericPages.add(seo.urlSlug);
              if (
                typeof permission === 'object' &&
                permission !== null &&
                !isPermissionPublic(permission)
              ) {
                restrictedPages.set(restrictedPageKey(locale, seo.urlSlug), permission);
              }
            }
            for (const { slug } of seo?.urlSlugHistory ?? []) {
              if (typeof slug === 'string') genericPages.add(slug);
            }
          }
        }),
      ),
    );

    return { genericPages, restrictedPages };
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
