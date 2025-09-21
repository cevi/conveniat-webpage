import type { Locale } from '@/types/types';

export const getLanguagePrefix = (locale: Locale | undefined): string => {
  if (locale === undefined) return '';
  // default lang is german
  return locale === 'de' ? '' : `${locale}`;
};
