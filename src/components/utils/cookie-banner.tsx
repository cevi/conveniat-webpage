'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { Cookie, i18nConfig } from '@/types/types';
import Cookies from 'js-cookie';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

const staticCookieString: StaticTranslationString = {
  de: 'conveniat27 speichert Cookies, um richtig zu funktionieren.',
  en: 'conveniat27 saves cookies in order to function properly.',
  fr: 'conveniat27 utilise des cookies pour fonctionner correctement.',
};

const staticCookieAcceptString: StaticTranslationString = {
  de: 'Akzeptieren',
  en: 'Accept',
  fr: 'Accepter',
};

const shouldShowCookieBanner = (): boolean => {
  return (Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) ?? 'false') === 'false';
};

export const CookieBanner: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [showBanner, setShowBanner] = useState(shouldShowCookieBanner);

  const acceptCookies = (): void => {
    Cookies.set(Cookie.CONVENIAT_COOKIE_BANNER, 'true', { expires: 90 });
    setShowBanner(false);
  };

  if (!showBanner) return <></>;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-800 px-4 py-2 font-bold text-white shadow-lg">
        <span className="flex-1">{staticCookieString[locale]}</span>
        <button
          onClick={acceptCookies}
          className="cursor-pointer rounded-sm bg-white px-3 py-2 font-semibold text-gray-800"
        >
          {staticCookieAcceptString[locale]}
        </button>
      </div>
    </div>
  );
};
