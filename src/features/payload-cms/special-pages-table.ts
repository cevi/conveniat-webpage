import SearchPage from '@/features/payload-cms/page-layouts/search-page';
import type { Locale, LocalizedPageType } from '@/types/types';
import type React from 'react';

export interface SpecialRouteResolutionEntry {
  locales: Locale[];
  alternatives: {
    [locale in Locale]: string;
  };
  component: React.FC<LocalizedPageType>;
}

export interface SpecialRouteResolutionTable {
  [slugPrefix: string]: SpecialRouteResolutionEntry;
}

export const specialPagesTable: SpecialRouteResolutionTable = {
  search: {
    locales: ['en', 'de', 'fr'],
    alternatives: {
      en: '/search',
      de: '/suche',
      fr: '/recherche',
    },
    component: SearchPage,
  },
};

export const isSpecialPage = (slug_without_slash: string): boolean => {
  return Object.values(specialPagesTable).some(({ alternatives }) =>
    Object.values(alternatives).some((path) => path.replace(/^\//, '') === slug_without_slash),
  );
};

export const getSpecialPage = (
  slug_without_slash: string,
): (SpecialRouteResolutionEntry & { locale: Locale }) | undefined => {
  for (const config of Object.values(specialPagesTable)) {
    for (const [locale, path] of Object.entries(config.alternatives)) {
      if (path.replace(/^\//, '') === slug_without_slash) {
        return { ...config, locale: locale as Locale };
      }
    }
  }
  return undefined;
};
