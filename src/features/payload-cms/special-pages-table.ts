import { FormsPreviewPage } from '@/features/payload-cms/page-layouts/forms-preview-page';
import SearchPage from '@/features/payload-cms/page-layouts/search-page';
import { localizedPagePath } from '@/features/payload-cms/utils/metadata-helper';
import type { Locale, LocalizedCollectionPage, LocalizedPageType } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type React from 'react';

export interface SpecialRouteResolutionEntry {
  locales: Locale[];
  alternatives: {
    [locale in Locale]: string;
  };
  component: React.FC<LocalizedPageType> | React.ComponentType<LocalizedCollectionPage>;
  title: {
    [locale in Locale]: string;
  };
}

export interface SpecialRouteResolutionTable {
  [slugPrefix: string]: SpecialRouteResolutionEntry;
}

export const specialPagesTable: SpecialRouteResolutionTable = {
  search: {
    locales: i18nConfig.locales as Locale[],
    alternatives: {
      en: '/search',
      de: '/suche',
      fr: '/recherche',
    },
    component: SearchPage,
    title: {
      en: 'Search',
      de: 'Suche',
      fr: 'Recherche',
    },
  },
  'forms-preview': {
    locales: i18nConfig.locales as Locale[],
    alternatives: {
      en: '/form-preview',
      de: '/formular-vorschau',
      fr: '/apercu-du-formulaire',
    },
    component: FormsPreviewPage,
    title: {
      en: 'Form Preview',
      de: 'Formularvorschau',
      fr: 'Apercu du Formulaire',
    },
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

/**
 * The path of a special page in every locale this deployment serves.
 *
 * @param entry - the special page
 * @returns the path by locale, German without a prefix
 */
export const specialPagePathsByLocale = (
  entry: SpecialRouteResolutionEntry,
): Partial<Record<Locale, string>> =>
  Object.fromEntries(
    (i18nConfig.locales as Locale[]).map((locale) => [
      locale,
      localizedPagePath(locale, '', entry.alternatives[locale].replace(/^\/+/, '')),
    ]),
  );
