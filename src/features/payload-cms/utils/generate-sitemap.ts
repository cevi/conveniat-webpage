import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { i18nConfig, type Locale } from '@/types/types';
import config from '@payload-config';
import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';

const toURL = (urlSegments: string[]): string => {
  return urlSegments.filter((seg) => seg !== '').join('/');
};

export const generateSitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const sitemap: MetadataRoute.Sitemap = [];
  const APP_HOST_URL = environmentVariables.APP_HOST_URL;

  const payload = await getPayload({ config });

  const genericPages = await payload.find({
    collection: 'generic-page',
    depth: 0,
    limit: 1000,
    locale: 'all',
  });

  for (const page of genericPages.docs) {
    const pageUrls: Partial<Record<Locale, string>> = {};

    for (const locale of Object.values(LOCALE)) {
      if (page.publishingStatus === undefined || page.publishingStatus === null) continue;

      const publishingStatus = page.publishingStatus as unknown as Record<
        Locale,
        { published: boolean }
      >;
      const isPublished = publishingStatus[locale]['published'];
      if (!isPublished) continue;

      const multiLangSlug = page.seo.urlSlug as unknown as Record<Locale, string | undefined>;
      const urlSlug = multiLangSlug[locale] ?? '';
      const localeInUrl = locale === (i18nConfig.defaultLocale as Locale) ? '' : locale;
      const urlSegments = [APP_HOST_URL, localeInUrl, urlSlug];
      pageUrls[locale] = toURL(urlSegments);
    }

    const alternates = Object.fromEntries(
      Object.entries(pageUrls).map(([locLocale, locUrl]) => [
        locLocale,
        {
          url: locUrl,
          hreflang: locLocale,
        },
      ]),
    );

    const url = pageUrls[i18nConfig.defaultLocale as Locale];
    if (url === undefined) continue;

    if (Boolean(url)) {
      sitemap.push({
        url,
        lastModified: page.updatedAt,
        alternates: {
          languages: {
            ...Object.fromEntries(
              Object.entries(alternates)
                .filter(([locLocale]) => locLocale !== i18nConfig.defaultLocale)
                .map(([locLocale, { url: locUrl }]) => [locLocale, locUrl]),
            ),
          },
        },
      });
    }
  }

  return sitemap;
};
