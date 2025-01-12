import { LocalizedCollectionPage, LocalizedPage } from '@/page-layouts/localized-page';
import React from 'react';
import { payloadConfig, RoutableCollectionConfig, RoutableGlobalConfig } from '@payload-config';
import { CollectionSlug } from 'payload';
import { PrivacyPage } from '@/page-layouts/privacy-page';
import { ImprintPage } from '@/page-layouts/imprint-page';
import { BlogPostPage } from '@/page-layouts/blog-posts';
import { GenericPage } from '@/page-layouts/generic-page';
import { Locale } from '@/types';
import { SearchPage } from '@/page-layouts/search-page';
import { TimeLinePage } from './timeline-page';

type GlobalRouteLookupTable = {
  [slug: string]: {
    locales: Locale[];
    alternatives: {
      [locale in Locale]: string;
    };
    component: React.FC<LocalizedPage>;
  };
};

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
type PageSlug =
  | RoutableCollectionConfig['reactComponentSlug']
  | RoutableGlobalConfig['reactComponentSlug'];

/**
 * Maps the pageSlugs to React components.
 *
 * We cannot use the `import` statement to import the components directly, as this breaks
 * the generate:types script. Instead, we use a lookup table to map the slugs to the components.
 *
 * This way, the components are never imported when reading the PayloadConfig, and$
 * the generate:types script can generate the types correctly.
 */
const reactComponentSlugLookup: Record<
  PageSlug,
  React.FC<LocalizedCollectionPage> | React.FC<LocalizedPage>
> = {
  'privacy-page': PrivacyPage,
  'imprint-page': ImprintPage,
  'search-page': SearchPage,
  'blog-posts': BlogPostPage,
  'timeline-posts': TimeLinePage,
  'generic-page': GenericPage,
};

/**
 * This is a lookup table for all routes that are defined in the global config.
 * It is used to map the URL to the corresponding page component.
 *
 * Defining pages using global config is not the recommended way to define pages in PayloadCMS.
 * Instead, use the collection config to define pages. We use global config only for pages that
 * are special and enforced to be globally available (e.g. imprint, privacy policy, etc.).
 *
 * The landing page is not handled by this lookup table, as it is a special case and is handled
 * separately in the `src/app/(frontend)/page.tsx` file.
 *
 */
export const globalsRouteLookupTable: GlobalRouteLookupTable =
  // eslint-disable-next-line complexity
  payloadConfig.globals?.reduce((routes, global) => {
    if ('urlSlug' in global && 'reactComponentSlug' in global) {
      const { urlSlug, reactComponentSlug } = global;
      for (const [locale, slug] of Object.entries(urlSlug)) {
        const locales = [locale as Locale, ...(routes[slug]?.locales ?? [])];

        if (!(reactComponentSlug in reactComponentSlugLookup)) {
          throw new Error(
            `Component not found for reactComponentSlug: ${reactComponentSlug as string}`,
          );
        }

        const component = reactComponentSlugLookup[reactComponentSlug];
        if (slug in routes && routes[slug]?.component !== component) {
          throw new Error(`More than one component defined for the same global page slug: ${slug}`);
        }

        routes[slug] = {
          locales: locales,
          alternatives: urlSlug,
          component: component as React.FC<LocalizedPage>,
        };
      }
    }
    return routes;
  }, {} as GlobalRouteLookupTable) ?? {};

export const collectionRouteLookupTable: CollectionRouteLookupTable =
  // eslint-disable-next-line complexity
  payloadConfig.collections?.reduce((routes, collection) => {
    if ('urlPrefix' in collection && 'reactComponentSlug' in collection) {
      const { urlPrefix, reactComponentSlug } = collection;
      for (const [locale, prefix] of Object.entries(urlPrefix)) {
        const locales = [locale as Locale, ...(routes[prefix]?.locales ?? [])];

        if (!(reactComponentSlug in reactComponentSlugLookup)) {
          throw new Error(
            `Component not found for reactComponentSlug: ${reactComponentSlug as string}`,
          );
        }

        const component = reactComponentSlugLookup[reactComponentSlug];
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
