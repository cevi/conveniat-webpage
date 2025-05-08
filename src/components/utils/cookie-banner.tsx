'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { Cookie, i18nConfig } from '@/types/types';
import Cookies from 'js-cookie';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useState } from 'react';

const staticCookieString: StaticTranslationString = {
  de: 'Bitte akzeptiere die Cookies.',
  en: 'Please accept the cookies.',
  fr: 'Veuillez accepter les cookies.',
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

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(shouldShowCookieBanner());
  }, []);

  const acceptCookies = (): void => {
    Cookies.set(Cookie.CONVENIAT_COOKIE_BANNER, 'true', { expires: 90 });
    setShowBanner(false);
  };

  if (!showBanner) return <></>;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="rounded-lg bg-gray-800 px-4 py-2 font-bold text-white shadow-lg">
        {staticCookieString[locale]}
        <button onClick={acceptCookies} className="ml-4 rounded bg-white p-2 text-gray-500">
          {staticCookieAcceptString[locale]}
        </button>
      </div>
    </div>
  );
};
