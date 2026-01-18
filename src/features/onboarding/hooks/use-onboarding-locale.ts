'use client';

import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import { OnboardingStep } from '@/features/onboarding/types';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale } from '@/types/types';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { useCallback, useEffect, useState } from 'react';

const getInitialLocale = (): Locale => {
  // Always return 'de' initially to match the server-side default and avoid hydration mismatch.
  // The useEffect hook will update the locale to the user's preference (cookie/browser) immediately after mount.
  return LOCALE.DE;
};

interface UseOnboardingLocaleResult {
  locale: keyof typeof cookieInfoText;
  handleLanguageChange: (newLocale: string) => void;
}

export const useOnboardingLocale = (onboardingStep: OnboardingStep): UseOnboardingLocaleResult => {
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(getInitialLocale);
  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] = useState(() => {
    if (typeof globalThis === 'undefined') return false;
    // Treat unset locale cookie as "ready for manual change" or initial state
    return Cookies.get(Cookie.LOCALE_COOKIE) === undefined;
  });

  // Sync locale state with cookie on mount to handle hydration and browser preference
  useEffect(() => {
    const cookieLocale = Cookies.get(Cookie.LOCALE_COOKIE);
    let targetLocale: Locale = LOCALE.EN;

    const supportedLocales = Object.values(LOCALE) as string[];

    if (cookieLocale && supportedLocales.includes(cookieLocale)) {
      targetLocale = cookieLocale as Locale;
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang && supportedLocales.includes(browserLang)) {
        targetLocale = browserLang as Locale;
      }
    }

    // Small delay to ensure client-side stability after mount
    setTimeout(() => {
      setLocale((current) => (current === targetLocale ? current : targetLocale));
      setHasManuallyChangedLanguage(true);
    }, 0);
  }, []);

  const handleLanguageChange = useCallback((newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  }, []);

  // Set the locale cookie
  useEffect(() => {
    if (hasManuallyChangedLanguage && onboardingStep >= OnboardingStep.Login) {
      Cookies.set(Cookie.LOCALE_COOKIE, locale, { expires: 730 });
    }
  }, [hasManuallyChangedLanguage, locale, onboardingStep]);

  return {
    locale,
    handleLanguageChange,
  };
};
