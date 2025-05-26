import { BlogPostPage } from '@/features/payload-cms/page-layouts/blog-posts';
import { GenericPage } from '@/features/payload-cms/page-layouts/generic-page';
import { TimelinePreviewPage } from '@/features/payload-cms/page-layouts/timeline-preview-page';
import type {
  Locale,
  LocalizedCollectionPage,
  LocalizedPageType,
  RoutableCollectionConfig,
} from '@/types/types';
import { payloadConfig } from '@payload-config';
import type { CollectionSlug } from 'payload';
import type React from 'react';

interface RouteResolutionTable {
  [slugPrefix: string]: {
    locales: Locale[];
    alternatives: {
      [locale in Locale]: string;
    };
    component: React.FC<LocalizedCollectionPage>;
    collectionSlug: CollectionSlug;
  };
}

/** The slugs that are used to identify the React components that
 * should be used to render the pages. */
type PageSlug = RoutableCollectionConfig['payloadCollection']['slug'];

/**
 * Maps the pageSlugs to React components.
 *
 * We cannot use the `import` statement to import the components directly, as this breaks
 * the generate:types script. Instead, we use a lookup table to map the slugs to the components.
 *
 * This way, the components are never imported when reading the PayloadConfig, and$
 * the generate:types script can generate the types correctly.
 */
const slugLookup: Record<
  PageSlug,
  React.FC<LocalizedCollectionPage> | React.FC<LocalizedPageType>
> = {
  blog: BlogPostPage,
  timeline: TimelinePreviewPage,
  'generic-page': GenericPage,
};

export const routeResolutionTable: RouteResolutionTable =
  payloadConfig.collections?.reduce((routes, collection) => {
    if ('urlPrefix' in collection) {
      const { urlPrefix, payloadCollection } = collection;
      for (const [locale, prefix] of Object.entries(urlPrefix)) {
        const locales = [locale as Locale, ...(routes[prefix]?.locales ?? [])];

        if (!(payloadCollection['slug'] in slugLookup)) {
          throw new Error(`Component not found for slug: ${payloadCollection['slug'] as string}`);
        }

        const component = slugLookup[payloadCollection['slug']];
        if (prefix in routes && routes[prefix]?.component !== component) {
          throw new Error(
            `More than one component defined for the same collection prefix: ${prefix}`,
          );
        }

        routes[prefix] = {
          locales: locales,
          alternatives: urlPrefix,
          component: component as React.FC<LocalizedCollectionPage>,
          collectionSlug: collection.payloadCollection.slug as CollectionSlug,
        };
      }
    }
    return routes;
  }, {} as RouteResolutionTable) ?? {};

/**
 * Maps an url prefix to the corresponding collection slug.
 *
 * @example If the user defines a blogs collection with the url prefix 'blog', this function
 * will return the collection slug 'blogs'.
 *
 * TODO: currently this function does not check if the locale is correct.
 *
 * @param urlPrefix
 */
export const urlPrefixToCollectionSlug = (urlPrefix: string): CollectionSlug | undefined => {
  return (
    Object.entries(routeResolutionTable).find(([prefix]) => prefix === urlPrefix)?.[1]
      .collectionSlug ?? undefined
  );
};

/**
 * Finds the url prefix for a given collection slug and locale.
 *
 * @param collectionSlug
 * @param locale
 */
export const findPrefixByCollectionSlugAndLocale = (
  collectionSlug: CollectionSlug,
  locale: Locale,
): string => {
  return (
    Object.entries(routeResolutionTable).find(
      (entry) => entry[1].collectionSlug === collectionSlug && entry[1].locales.includes(locale),
    )?.[0] ?? ''
  );
};
