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
  blogPosts: Set<string>;
}

interface SeoSlugs {
  seo?: { urlSlug?: string | null; urlSlugHistory?: { slug?: string | null }[] | null };
}

/**
 * Reads the slugs of every published Generic Page and blog post, and nothing else of them.
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

    const readSlugs = async (
      collection: 'generic-page' | 'blog',
      locale: LocaleCode,
    ): Promise<SeoSlugs[]> => {
      const result = await payload.find({
        collection,
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
    const blogPosts = new Set<string>();

    await Promise.all(
      enabledLocales.flatMap((locale) => [
        readSlugs('generic-page', locale).then((documents) => {
          for (const { seo } of documents) {
            if (typeof seo?.urlSlug === 'string') genericPages.add(seo.urlSlug);
            for (const { slug } of seo?.urlSlugHistory ?? []) {
              if (typeof slug === 'string') genericPages.add(slug);
            }
          }
        }),
        readSlugs('blog', locale).then((documents) => {
          for (const { seo } of documents) {
            if (typeof seo?.urlSlug === 'string') blogPosts.add(seo.urlSlug);
          }
        }),
      ]),
    );

    return { genericPages, blogPosts };
  });
};
