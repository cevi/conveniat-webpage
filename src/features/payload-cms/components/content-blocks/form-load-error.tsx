'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const formLoadErrorText: StaticTranslationString = {
  de: 'Das Formular konnte nicht geladen werden.',
  en: 'The form could not be loaded.',
  fr: "Le formulaire n'a pas pu être chargé.",
};

/** Shown in place of a form block that crashed while rendering. */
export const FormLoadError: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return <div className="text-red-500">{formLoadErrorText[locale]}</div>;
};
