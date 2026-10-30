import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { Metadata } from 'next';

/**
 * The path of a page in one locale. German, the default locale, is served without a prefix.
 *
 * @param locale - the locale of the page
 * @param slug - the URL slug of the page in that locale, empty for the landing page
 * @returns the absolute path, `/` for the German landing page
 */
export const localizedPagePath = (locale: Locale, slug: string): string =>
  `/${[locale === i18nConfig.defaultLocale ? '' : locale, slug]
    .filter((segment) => segment !== '')
    .join('/')}`;

/**
 * The canonical and language links of one version of a page, as Google asks for localized
 * versions: a translation is not a duplicate, so each version is its own canonical and lists
 * every version, itself included. German, served without a prefix, is the fallback for every
 * other language (`x-default`).
 * https://developers.google.com/search/docs/specialty/international/localized-versions
 *
 * Google requires absolute URLs. Page metadata passes paths, which `metadataBase` in the root
 * metadata resolves; the sitemap passes absolute URLs.
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
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
}
/**
 * The metadata of one version of a CMS page: its SEO fields and its language links.
 *
 * @param options.seo - the SEO fields of the version being rendered
 * @param options.locale - the locale of the version being rendered
 * @param options.slugsByLocale - the URL slug of every published version, by locale
 */
export function buildMetadata({
  seo,
  locale,
  slugsByLocale,
}: {
  seo: SEOType;
  locale: Locale;
  slugsByLocale: Partial<Record<Locale, string>>;
}): Metadata {
  const pathsByLocale = Object.fromEntries(
    Object.entries(slugsByLocale).map(([l, slug]) => [l, localizedPagePath(l as Locale, slug)]),
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
