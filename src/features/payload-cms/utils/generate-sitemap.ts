import type { MetadataRoute } from 'next';
import {
  routeResolutionTable,
  urlPrefixToCollectionSlug,
} from '@/features/payload-cms/route-resolution-table';
import { i18nConfig } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import type { Blog } from '@/features/payload-cms/payload-types';

const toURL = (urlSegments: string[]): string => {
  return urlSegments.filter((seg) => seg !== '').join('/');
};

// eslint-disable-next-line complexity
export const generateSitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const sitemap: MetadataRoute.Sitemap = [];
  const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';

  const payload = await getPayload({ config });

  const defaultLocale = i18nConfig.defaultLocale;

  for (const [urlPrefix, collection] of Object.entries(routeResolutionTable)) {
    // add urlPrefix as it's own page to the sitemap
    for (const locale of collection.locales) {
      const localePrefix = locale === defaultLocale ? '' : `${locale}`;

      sitemap.push({
        url: toURL([APP_HOST_URL, localePrefix, urlPrefix]),
      });
    }

    if (collection.collectionSlug == 'timeline') continue; // skip timeline entries

    for (const locale of collection.locales) {
      const localePrefix = locale === defaultLocale ? '' : `${locale}`;

      const collectionSlug = urlPrefixToCollectionSlug(urlPrefix);
      if (collectionSlug === undefined) {
        throw new Error(`Collection slug not found for url prefix: ${urlPrefix}`);
      }

      const collectionPayloadElements = await payload.find({
        collection: collectionSlug,
        where: {
          _localized_status: {
            equals: {
              published: true,
            },
          },
        },
        locale: locale,
      });

      for (const element of collectionPayloadElements.docs) {
        const elementURL =
          collectionSlug == 'blog' ? (element as Blog).seo.urlSlug : 'does-not-exist';

        if (collectionSlug === 'blog') {
          const currentDate = new Date().toISOString();
          if ((element as Blog).content.releaseDate > currentDate) {
            continue;
          }
        }

        sitemap.push({
          url: toURL([APP_HOST_URL, localePrefix, urlPrefix, elementURL]),
          lastModified: element.updatedAt,
          alternates: {
            // TODO: list alternatives, currently this needs another query to the CMS
            //       we should consider returning the alternatives with the payload response
            //       this would also be helpful for the collection resolver
          },
        } as MetadataRoute.Sitemap[0]);
      }
    }
  }

  return sitemap;
};
