import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { PrismaClient } from '@/lib/prisma';
import type { ITXClientDenyList } from '@/lib/prisma/runtime/client';
import type { Metadata } from 'next';
import type { Config } from 'next-i18n-router/dist/types';
import type { CollectionConfig, Config as PayloadConfig } from 'payload';
import type React from 'react';

const locales = Object.values(LOCALE);

export const i18nConfig: Config = {
  locales: locales,
  defaultLocale: LOCALE.DE,
  serverSetCookie: 'always',
};

export type Locale = (typeof locales)[number];
export type StaticTranslationString = Record<Locale, string>;

export interface SearchParameters {
  [key: string]: string | string[];
}

export interface LocalizedPageType {
  locale: Locale;
  searchParams: SearchParameters;
}

export type LocalizedCollectionPage = LocalizedPageType & {
  slugs: string[];
  renderInPreviewMode: boolean;
};

export type LocalizedCollectionComponent = React.FC<LocalizedCollectionPage> & {
  generateMetadata?: (parameters: {
    locale: Locale;
    slugs: string[] | undefined;
  }) => Promise<Metadata>;
};

export interface RoutableCollectionConfig {
  urlPrefix: {
    [locale in Locale]: string;
  };
  /** The collection configuration that should be used to render the page. */
  payloadCollection: CollectionConfig;
}

export type RoutableCollectionConfigs = (CollectionConfig | RoutableCollectionConfig)[];

export type RoutableConfig = Omit<PayloadConfig, 'collections'> & {
  collections?: RoutableCollectionConfigs;
};

export enum Cookie {
  APP_DESIGN = 'app-design',
  HAS_LOGGED_IN = 'has-logged-in',
  CONVENIAT_COOKIE_BANNER = 'conveniat-cookie-banner',
}

export type PrismaClientOrTransaction = Omit<PrismaClient, ITXClientDenyList>;

// Define the shape of the context value
export interface StarContextType {
  isStarred: (id: string) => boolean;
  toggleStar: (id: string) => void;
}
