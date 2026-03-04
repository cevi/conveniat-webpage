import { i18nConfig } from '@/types/types';

export const stripDefaultLocale = (url: string): string => {
  const defaultLocalePrefix = `/${i18nConfig.defaultLocale}`;
  if (url === defaultLocalePrefix) return '/';
  if (url.startsWith(`${defaultLocalePrefix}/`)) return url.slice(defaultLocalePrefix.length);
  return url;
};
