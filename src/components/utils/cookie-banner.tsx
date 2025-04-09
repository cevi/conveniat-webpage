'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { i18nConfig, Locale } from '@/types';
import { useCurrentLocale } from 'next-i18n-router/client';

const COOKIE_NAME = 'conveniat-cookie-banner';

const shouldShowCookieBanner = (): boolean => {
  return (Cookies.get(COOKIE_NAME) ?? 'false') === 'false';
};

export const CookieBanner: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(shouldShowCookieBanner());
  }, []);

  const acceptCookies = () => {
    Cookies.set(COOKIE_NAME, 'true');
    setShowBanner(false);
  };

  if (!showBanner) return <></>;

  const StaticCookieString = {
    de: 'Bitte akzeptiere die Cookies.',
    en: 'Please accept the cookies.',
    fr: 'Veuillez accepter les cookies.',
  };
  const StaticCookieAccpetString = {
    de: 'Akzeptieren',
    en: 'Accept',
    fr: 'Accepter',
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="rounded-lg bg-gray-800 px-4 py-2 font-bold text-white shadow-lg">
        {StaticCookieString[locale]}
        <button onClick={acceptCookies} className="ml-4 rounded bg-white p-2 text-gray-500">
          {StaticCookieAccpetString[locale]}
        </button>
      </div>
    </div>
  );
};
