import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { Metadata } from 'next';
import type { BasePayload, CollectionSlug } from 'payload';

/**
 * Finds the published versions of a page in every locale this deployment serves.
 *
 * @returns the URL slug of the page by locale, for the locales it is published in
 */
export async function findAlternatives({
  payload,
  collection,
  internalPageName,
  currentDate,
}: {
  payload: BasePayload;
  collection: CollectionSlug;
  internalPageName: string;
  currentDate?: string;
}): Promise<Partial<Record<Locale, string>>> {
  const hasReleaseDate = collection === 'blog';

  const slugsByLocale = await Promise.all(
    (i18nConfig.locales as Locale[]).map(async (l) => {
      const result = await payload.find({
        collection,
        pagination: false,
        fallbackLocale: false,
        locale: l,
        draft: false,
        // Only seo.urlSlug is used for building alternate URLs.
        // Skip all relationships and content blocks.
        depth: 0,
        select: {
          seo: true,
        },
        where: {
          and: [
            { internalPageName: { equals: internalPageName } },
            { _localized_status: { equals: { published: true } } },
            ...(hasReleaseDate
              ? [{ 'content.releaseDate': { less_than_equal: currentDate } }]
              : []),
          ],
        },
      });
      const document_ =
        result.docs.length === 1 ? (result.docs[0] as Blog | GenericPage) : undefined;
      return [l, document_?.seo.urlSlug] as const;
    }),
  );

  return Object.fromEntries(slugsByLocale.filter(([, slug]) => slug !== undefined));
}

/**
 * The path of a page in one locale. German, the default locale, is served without a prefix.
 *
 * @param locale - the locale of the page
 * @param urlPrefix - the path segment of the collection, empty for generic pages
 * @param slug - the URL slug of the page in that locale, empty for the landing page
 */
export const localizedPagePath = (locale: Locale, urlPrefix: string, slug: string): string =>
  `/${[locale === i18nConfig.defaultLocale ? '' : locale, urlPrefix, slug]
    .filter((segment) => segment !== '')
    .join('/')}`;

/**
 * The canonical and language links of one version of a page, as Google asks for localized
 * versions: a translation is not a duplicate, so each version is its own canonical and lists
 * every version, itself included. German, served without a prefix, is the fallback for every
 * other language (`x-default`).
 * https://developers.google.com/search/docs/specialty/international/localized-versions
 *
 * The paths are relative; `metadataBase` in the root metadata makes them absolute, which Google
 * requires.
 *
 * @param pathsByLocale - the path or URL of every published version of the page, by locale
 * @param locale - the locale of the version being rendered
 */
export const buildLanguageAlternates = (
  pathsByLocale: Partial<Record<Locale, string>>,
  locale: Locale,
): { canonical: string; languages: Partial<Record<Locale | 'x-default', string>> } | undefined => {
  const canonical = pathsByLocale[locale];
  if (canonical === undefined) return undefined;

  const fallback = pathsByLocale[i18nConfig.defaultLocale as Locale];
  return {
    canonical,
    languages: { ...pathsByLocale, ...(fallback !== undefined && { 'x-default': fallback }) },
  };
};

interface SEOType {
  urlSlug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
}
/**
 * The metadata of one version of a CMS page: its SEO fields and its language links.
 */
export function buildMetadata({
  seo,
  locale,
  slugsByLocale,
  urlPrefix = '',
}: {
  seo: SEOType;
  locale: Locale;
  slugsByLocale: Partial<Record<Locale, string>>;
  urlPrefix?: string;
}): Metadata {
  const pathsByLocale = Object.fromEntries(
    Object.entries(slugsByLocale).map(([l, slug]) => [
      l,
      localizedPagePath(l as Locale, urlPrefix, slug),
    ]),
  );
  const alternates = buildLanguageAlternates(pathsByLocale, locale);

  return {
    ...(seo.metaTitle && { title: seo.metaTitle }),
    ...(seo.metaDescription && { description: seo.metaDescription }),
    ...(seo.keywords && { keywords: seo.keywords }),
    openGraph: {
      type: 'website',
      ...(seo.metaTitle && { title: seo.metaTitle }),
      ...(seo.metaDescription && { description: seo.metaDescription }),
    },
    ...(alternates && { alternates }),
  };
}
