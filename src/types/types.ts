import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { PrismaClient } from '@/lib/prisma';
import type { ITXClientDenyList } from '@/lib/prisma/runtime/client';
import type { Metadata } from 'next';
import type { Config } from 'next-i18n-router/dist/types';
import type { CollectionConfig, Config as PayloadConfig } from 'payload';
import type React from 'react';

const locales = Object.values(LOCALE);

export enum Cookie {
  DESIGN_MODE = 'design-mode',
  HAS_LOGGED_IN = 'has-logged-in',
  CONVENIAT_COOKIE_BANNER = 'conveniat-cookie-banner',
  LOCALE_COOKIE = 'next-locale',
  SKIP_PUSH_NOTIFICATION = 'skip-push-notification',
  HAS_SKIPPED_AUTH = 'has-skipped-auth',
  OFFLINE_CONTENT_HANDLED = 'skip-offline-content',
}

export enum Header {
  DESIGN_MODE = 'x-design-mode',
  MIDDLEWARE_REWRITES = 'x-middleware-rewrite',
}

interface I18nConfig extends Config {
  localeCookie: string;
}

export const i18nConfig: I18nConfig = {
  locales: locales,
  defaultLocale: LOCALE.DE,
  localeCookie: Cookie.LOCALE_COOKIE,
  serverSetCookie: 'always',
};

export type Locale = (typeof locales)[number];
export type StaticTranslationString = Record<Locale, string>;

export interface SearchParameters {
  [key: string]: string | string[];
}

export interface LocalizedPageType {
  locale: Locale;
  searchParams?: Promise<SearchParameters>;
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

export type PrismaClientOrTransaction = Omit<PrismaClient, ITXClientDenyList>;

// Define the shape of the context value
export interface StarContextType {
  isStarred: (id: string) => boolean;
  toggleStar: (id: string) => void;
  starredEntries: Set<string>;
}
