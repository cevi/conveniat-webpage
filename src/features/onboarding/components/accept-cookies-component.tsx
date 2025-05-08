import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import type { StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import React from 'react';

export const cookieInfoText: StaticTranslationString = {
  en: 'We use cookies to ensure you get the best experience within our app.',
  de: 'Wir verwenden Cookies, um Ihnen die beste Erfahrung in unserer App zu bieten.',
  fr: 'Nous utilisons des cookies pour vous garantir la meilleure expérience dans notre application.',
};

const acceptCookiesText: StaticTranslationString = {
  en: 'Accept Cookies',
  de: 'Cookies akzeptieren',
  fr: 'Accepter les cookies',
};

const handleAcceptCookies = (): void => {
  Cookies.set(Cookie.CONVENIAT_COOKIE_BANNER, 'true', { expires: 730 });
};

export const AcceptCookieEntrypointComponent: React.FC<{
  locale: 'de' | 'fr' | 'en';
  callback: () => void;
}> = ({ locale, callback }) => {
  return (
    <div className="rounded-lg p-8 text-center">
      <CenteredConveniatLogo />

      <p className="mb-4 text-balance text-gray-700">{cookieInfoText[locale]}</p>

      <button
        onClick={() => {
          handleAcceptCookies();
          callback();
        }}
        className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
      >
        {acceptCookiesText[locale]}
      </button>
    </div>
  );
};
