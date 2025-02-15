import { Config } from 'next-i18n-router/dist/types';
import { LOCALE } from '@/payload-cms/locales';

const locales = Object.values(LOCALE);

export const i18nConfig: Config = {
  locales: locales,
  defaultLocale: LOCALE.DE,
  serverSetCookie: 'always',
};

export type Locale = (typeof locales)[number];
export type StaticTranslationString = Record<Locale, string>;
export type SearchParameters = { [key: string]: string | string[] };
