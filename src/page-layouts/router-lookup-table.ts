import { LocalizedCollectionPage, LocalizedPage } from '@/page-layouts/localized-page';
import React from 'react';
import { payloadConfig, RoutableCollectionConfig } from '@payload-config';
import { CollectionSlug } from 'payload';
import { BlogPostPage } from '@/page-layouts/blog-posts';
import { GenericPage } from '@/page-layouts/generic-page';
import { Locale } from '@/types';
import { TimeLinePage } from './timeline-page';

type CollectionRouteLookupTable = {
  [slugPrefix: string]: {
    locales: Locale[];
    alternatives: {
      [locale in Locale]: string;
    };
    component: React.FC<LocalizedCollectionPage>;
    collectionSlug: CollectionSlug;
  };
};

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
const slugLookup: Record<PageSlug, React.FC<LocalizedCollectionPage> | React.FC<LocalizedPage>> = {
  blog: BlogPostPage,
  timeline: TimeLinePage,
  'generic-page': GenericPage,
};

export const collectionRouteLookupTable: CollectionRouteLookupTable =
  // eslint-disable-next-line complexity
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
  }, {} as CollectionRouteLookupTable) ?? {};

export const urlPrefixToCollectionSlug = (urlPrefix: string): CollectionSlug | undefined => {
  return (
    Object.entries(collectionRouteLookupTable).find(([prefix]) => prefix === urlPrefix)?.[1]
      .collectionSlug ?? undefined
  );
};

export const findPrefixByCollectionSlugAndLocale = (
  collectionSlug: CollectionSlug,
  locale: Locale,
): string => {
  return (
    Object.entries(collectionRouteLookupTable).find(
      (entry) => entry[1].collectionSlug === collectionSlug && entry[1].locales.includes(locale),
    )?.[0] ?? ''
  );
};
