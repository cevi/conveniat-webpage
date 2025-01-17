import { Config } from 'next-i18n-router/dist/types';

const locales = ['en', 'de', 'fr'] as const;

export const i18nConfig: Config = {
  locales: locales,
  defaultLocale: 'de',
  serverSetCookie: 'always',
};

export type Locale = (typeof locales)[number];
export type SearchParameters = { [key: string]: string | string[] };
