import { LocalizedCollectionPage, LocalizedPage } from '@/page-layouts/localized-page';
import React from 'react';
import { payloadConfig } from '@payload-config';

type GlobalRouteLookupTable = {
  [slug: string]: {
    locales: ('de' | 'en' | 'fr')[];
    alternatives: {
      [locale in 'de' | 'en' | 'fr']: string;
    };
    component: React.FC<LocalizedPage>;
  };
};

type CollectionRouteLookupTable = {
  [slugPrefix: string]: {
    locales: ('de' | 'en' | 'fr')[];
    alternatives: {
      [locale in 'de' | 'en' | 'fr']: string;
    };
    component: React.FC<LocalizedCollectionPage>;
  };
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
 * separately in the `src/app/(frontend)/blog-posts.tsx` file.
 *
 */
export const globalsRouteLookupTable: GlobalRouteLookupTable =
  payloadConfig.globals?.reduce((routes, global) => {
    if ('urlSlug' in global && 'reactComponent' in global) {
      const { urlSlug, reactComponent } = global;
      for (const [locale, slug] of Object.entries(urlSlug)) {
        const locales = [locale as 'de' | 'en' | 'fr', ...(routes[slug]?.locales ?? [])];

        if (slug in routes && routes[slug]?.component !== reactComponent) {
          throw new Error(`More than one component defined for the same global page slug: ${slug}`);
        }

        routes[slug] = {
          locales: locales,
          alternatives: urlSlug,
          component: reactComponent,
        };
      }
    }
    return routes;
  }, {} as GlobalRouteLookupTable) ?? {};

export const collectionRouteLookupTable: CollectionRouteLookupTable =
  payloadConfig.collections?.reduce((routes, collection) => {
    if ('urlPrefix' in collection && 'reactComponent' in collection) {
      const { urlPrefix, reactComponent } = collection;
      for (const [locale, prefix] of Object.entries(urlPrefix)) {
        const locales = [locale as 'de' | 'en' | 'fr', ...(routes[prefix]?.locales ?? [])];

        if (prefix in routes && routes[prefix]?.component !== reactComponent) {
          throw new Error(
            `More than one component defined for the same collection prefix: ${prefix}`,
          );
        }

        routes[prefix] = {
          locales: locales,
          alternatives: urlPrefix,
          component: reactComponent,
        };
      }
    }
    return routes;
  }, {} as CollectionRouteLookupTable) ?? {};
