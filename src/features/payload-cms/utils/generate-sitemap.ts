import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Blog, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { i18nConfig, type Locale } from '@/types/types';
import { isPermissionPublic } from '@/utils/has-permissions';
import config from '@payload-config';
import type { MetadataRoute } from 'next';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';
import { specialPagesTable } from '../special-pages-table';

/**
 * Interface representing a collection of alternate language URLs for a sitemap entry.
 */
interface SitemapAlternates {
  [key: string]: {
    url: string;
    hreflang: string;
  };
}

/**
 * Constructs a clean URL path from an array of segments, filtering out empty segments.
 *
 * @param urlSegments - An array of strings representing parts of a URL path.
 * @returns A string representing the joined URL path.
 */
const combineUrlSegments = (urlSegments: string[]): string => {
  return urlSegments.filter((segment) => segment !== '').join('/');
};

/**
 * Creates a single sitemap entry adhering to the Next.js `MetadataRoute.Sitemap` format.
 * Includes the primary URL, last modification date, and alternate language links.
 *
 * @param url - The primary URL for this sitemap entry.
 * @param page - The GenericPage object from Payload CMS, used for `updatedAt`.
 * @param alternates - An object containing alternate language URLs for this page.
 * @returns A sitemap entry object.
 */
interface SpecialPage {
  updatedAt?: undefined;
}

const createSitemapEntry = (
  url: string,
  page: GenericPage | Blog | SpecialPage,
  alternates: SitemapAlternates,
): MetadataRoute.Sitemap[0] => {
  return {
    url,
    lastModified: page.updatedAt,
    alternates: {
      languages: {
        ...Object.fromEntries(
          Object.entries(alternates).map(([locale, { url: localizedUrl }]) => [
            locale,
            localizedUrl,
          ]),
        ),
      },
    },
  };
};

/**
 * Builds a record of alternate language URLs for a given page, excluding the base locale.
 *
 * @param pageUrlsByLocale - A partial record mapping locales to their respective page URLs.
 * @param baseLocale - The primary locale for which alternates are being generated (this locale will be excluded).
 * @returns An object where keys are locales and values contain the URL and hreflang attribute.
 */
const buildLocalizedAlternates = (
  pageUrlsByLocale: Partial<Record<Locale, string>>,
  baseLocale: Locale,
): SitemapAlternates => {
  return Object.fromEntries(
    Object.entries(pageUrlsByLocale)
      // Exclude the base locale from alternates
      .filter(([locale]) => locale !== baseLocale)
      .map(([locale, url]) => [
        locale,
        {
          url,
          hreflang: locale,
        },
      ]),
  );
};

/**
 * Retrieves all published localized URLs for a given generic page.
 * It checks the publishing status and slug for each locale.
 *
 * @param page - The GenericPage object from Payload CMS.
 * @param appHostUrl - The base URL of the application.
 * @param defaultLocale - The application's default locale.
 * @returns A partial record mapping each locale to its corresponding published URL, if available.
 */
const getPublishedLocalizedPageUrls = (
  page: GenericPage | Blog,
  appHostUrl: string,
  defaultLocale: Locale,
  collectionSlug: string,
): Partial<Record<Locale, string>> => {
  const localizedUrls: Partial<Record<Locale, string>> = {};

  const publishingStatus = page.publishingStatus as
    | Record<Locale, { published: boolean }>
    | undefined;
  const multiLangSlug = page.seo.urlSlug as unknown as Record<Locale, string>;

  for (const locale of Object.values(LOCALE)) {
    const isPublished = publishingStatus?.[locale].published ?? false;
    if (!isPublished) {
      continue;
    }

    const urlSlug = multiLangSlug[locale];
    const localeInUrl = locale === defaultLocale ? '' : locale;

    localizedUrls[locale] = combineUrlSegments([appHostUrl, collectionSlug, localeInUrl, urlSlug]);
  }

  return localizedUrls;
};

function getCanonicalUrl(
  pageUrlsByLocale: Partial<Record<Locale, string>>,
  priorityLocales: Locale[],
): { canonicalUrl?: string; canonicalLocale?: Locale } {
  for (const locale of priorityLocales) {
    const url = pageUrlsByLocale[locale];
    if (url) return { canonicalUrl: url, canonicalLocale: locale };
  }
  return {};
}

function processDocumentsForSitemap(
  documents: GenericPage[] | Blog[],
  basePath: string,
  sitemap: MetadataRoute.Sitemap,
  {
    APP_HOST_URL,
    defaultLocale,
    canonicalURLPriorityList,
  }: {
    APP_HOST_URL: string;
    defaultLocale: Locale;
    canonicalURLPriorityList: Locale[];
  },
): void {
  for (const document_ of documents) {
    const pageUrlsByLocale = getPublishedLocalizedPageUrls(
      document_,
      APP_HOST_URL,
      defaultLocale,
      basePath,
    );

    const { canonicalUrl, canonicalLocale } = getCanonicalUrl(
      pageUrlsByLocale,
      canonicalURLPriorityList,
    );

    if (
      canonicalUrl &&
      canonicalLocale &&
      isPermissionPublic(document_.content.permissions as Permission)
    ) {
      const alternates = buildLocalizedAlternates(pageUrlsByLocale, canonicalLocale);
      sitemap.push(createSitemapEntry(canonicalUrl, document_, alternates));
    }
  }
}

/**
 * Generates a sitemap for Next.js applications by fetching generic pages from Payload CMS.
 * It includes all published pages/blog posts with their localized alternate URLs.
 *
 * @returns A promise that resolves to an array of sitemap entries.
 */
export const sitemapGenerator = async (): Promise<MetadataRoute.Sitemap> => {
  const sitemap: MetadataRoute.Sitemap = [];
  const APP_HOST_URL = environmentVariables.APP_HOST_URL;
  const defaultLocale = i18nConfig.defaultLocale as Locale;
  const payload = await getPayload({ config });
  const currentDate = new Date().toISOString();

  const canonicalURLPriorityList: Locale[] = [LOCALE.DE, LOCALE.FR, LOCALE.EN];

  const collectionsToProcess = [
    { name: 'generic-page', basePath: '' },
    { name: 'blog', basePath: 'blog' },
  ];

  for (const { name, basePath } of collectionsToProcess) {
    const { docs } = await payload.find({
      collection: name as CollectionSlug,
      depth: 1,
      limit: 1000,
      locale: 'all',
      where: {
        'content.releaseDate': {
          less_than_equal: currentDate,
        },
      },
    });

    processDocumentsForSitemap(docs as Blog[] | GenericPage[], basePath, sitemap, {
      APP_HOST_URL,
      defaultLocale,
      canonicalURLPriorityList,
    });
  }

  // add special pages
  // --> search
  const searchPage = specialPagesTable['search'];
  if (searchPage && searchPage.alternatives) {
    const pageUrlsByLocale: SitemapAlternates = {
      fr: {
        url: combineUrlSegments([APP_HOST_URL, 'fr', searchPage.alternatives.fr.replace('/', '')]),
        hreflang: 'fr',
      },
      en: {
        url: combineUrlSegments([APP_HOST_URL, 'en', searchPage.alternatives.en.replace('/', '')]),
        hreflang: 'en',
      },
    };
    sitemap.push(
      createSitemapEntry(combineUrlSegments([APP_HOST_URL, 'suche']), {}, pageUrlsByLocale),
    );
  }

  return sitemap;
};
