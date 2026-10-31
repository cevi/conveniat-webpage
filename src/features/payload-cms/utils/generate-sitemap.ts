import { environmentVariables } from '@/config/environment-variables';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import {
  specialPagePathsByLocale,
  specialPagesTable,
} from '@/features/payload-cms/special-pages-table';
import {
  buildLanguageAlternates,
  localizedPagePath,
} from '@/features/payload-cms/utils/metadata-helper';
import type { Locale } from '@/types/types';

import config from '@payload-config';
import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

/**
 * Adds one entry for every published version of a page. Each entry lists every version,
 * itself included, as Google asks for localized versions in a sitemap.
 * https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap
 *
 * @param sitemap - the sitemap to add the entries to
 * @param urlsByLocale - the absolute URL of every published version of the page, by locale
 * @param lastModified - when the page was last changed, if known
 */
const addLocalizedEntries = (
  sitemap: MetadataRoute.Sitemap,
  urlsByLocale: Partial<Record<Locale, string>>,
  lastModified?: string,
): void => {
  for (const locale of Object.keys(urlsByLocale) as Locale[]) {
    const alternates = buildLanguageAlternates(urlsByLocale, locale);
    if (alternates === undefined) continue;
    sitemap.push({
      url: alternates.canonical,
      lastModified,
      alternates: { languages: alternates.languages },
    });
  }
};

/**
 * Retrieves all published localized URLs for a given generic page.
 * It checks the publishing status and slug for each locale.
 *
 * @param page - The generic page from Payload CMS.
 * @param appHostUrl - The base URL of the application.
 * @returns A partial record mapping each locale to its corresponding published URL, if available.
 */
const getPublishedLocalizedPageUrls = (
  page: GenericPage,
  appHostUrl: string,
): Partial<Record<Locale, string>> => {
  const localizedUrls: Partial<Record<Locale, string>> = {};

  const publishingStatus = page.publishingStatus as
    Record<Locale, { published: boolean }> | undefined;
  const multiLangSlug = page.seo.urlSlug as unknown as Record<Locale, string>;

  for (const locale of enabledLocales) {
    const isPublished = publishingStatus?.[locale].published ?? false;
    if (!isPublished) {
      continue;
    }

    localizedUrls[locale] = appHostUrl + localizedPagePath(locale, multiLangSlug[locale]);
  }

  return localizedUrls;
};

function processDocumentsForSitemap(
  documents: GenericPage[],
  sitemap: MetadataRoute.Sitemap,
  {
    APP_HOST_URL,
    publicPermissionIds,
  }: {
    APP_HOST_URL: string;
    publicPermissionIds: Set<string>;
  },
): void {
  for (const document_ of documents) {
    let permissionId: string | undefined;
    if (document_.content.permissions) {
      permissionId =
        typeof document_.content.permissions === 'object'
          ? document_.content.permissions.id
          : document_.content.permissions;
    }

    if (permissionId === undefined || publicPermissionIds.has(permissionId)) {
      addLocalizedEntries(
        sitemap,
        getPublishedLocalizedPageUrls(document_, APP_HOST_URL),
        document_.updatedAt,
      );
    }
  }
}

/**
 * Generates a sitemap for Next.js applications by fetching generic pages from Payload CMS.
 * It includes all published pages with their localized alternate URLs.
 *
 * @returns A promise that resolves to an array of sitemap entries.
 */
export const cachedSitemapGenerator = async (): Promise<MetadataRoute.Sitemap> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'collection:generic-page');

  const sitemap: MetadataRoute.Sitemap = [];
  const APP_HOST_URL = environmentVariables.APP_HOST_URL;
  const payload = await getPayload({ config });
  const currentDate = new Date().toISOString();

  // Fetch all public permissions first to avoid depth: 1 cascades
  const { docs: permissions } = await payload.find({
    collection: 'permissions',
    depth: 0,
    limit: 0,
    where: {
      'special_permissions.public': {
        equals: true,
      },
    },
  });
  const publicPermissionIds = new Set(permissions.map((p) => p.id));

  const { docs } = await payload.find({
    collection: 'generic-page',
    depth: 0,
    limit: 1000,
    locale: 'all',
    where: {
      'content.releaseDate': {
        less_than_equal: currentDate,
      },
    },
  });

  processDocumentsForSitemap(docs, sitemap, { APP_HOST_URL, publicPermissionIds });

  // add special pages
  // --> search
  const searchPage = specialPagesTable['search'];
  if (searchPage?.alternatives) {
    addLocalizedEntries(
      sitemap,
      Object.fromEntries(
        Object.entries(specialPagePathsByLocale(searchPage)).map(([locale, path]) => [
          locale,
          APP_HOST_URL + path,
        ]),
      ),
    );
  }

  return sitemap;
};
