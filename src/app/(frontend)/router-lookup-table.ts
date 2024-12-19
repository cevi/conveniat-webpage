import { LocalizedPage } from '@/content-pages/localized-page';
import React from 'react';
import { payloadConfig } from '@payload-config';

type RouteLookupTable = {
  [slug: string]: {
    locale: 'de' | 'en' | 'fr';
    alternatives: {
      [locale in 'de' | 'en' | 'fr']: string;
    };
    component: React.FC<LocalizedPage>;
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
 * separately in the `src/app/(frontend)/page.tsx` file.
 *
 */
export const routeLookupTable: RouteLookupTable =
  payloadConfig.globals?.reduce((routes, global) => {
    if ('urlSlug' in global && 'reactComponent' in global) {
      const { urlSlug, reactComponent } = global;
      for (const [locale, slug] of Object.entries(urlSlug)) {
        routes[slug] = {
          locale: locale as 'de' | 'en' | 'fr',
          alternatives: urlSlug,
          component: reactComponent,
        };
      }
    }
    return routes;
  }, {} as RouteLookupTable) ?? {};
