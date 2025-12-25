import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import React from 'react';

import { acceptCookiesText, cookieInfoText } from '@/features/onboarding/onboarding-constants';

const handleAcceptCookies = (): void => {
  Cookies.set(Cookie.CONVENIAT_COOKIE_BANNER, 'true', { expires: 730 });
};

export const AcceptCookieEntrypointComponent: React.FC<{
  locale: 'de' | 'fr' | 'en';
  callback: () => void;
}> = ({ locale, callback }) => {
  return (
    <>
      <p className="mb-8 text-lg text-balance text-gray-700">{cookieInfoText[locale]}</p>

      <button
        onClick={() => {
          handleAcceptCookies();
          callback();
        }}
        className="font-heading transform cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]"
      >
        {acceptCookiesText[locale]}
      </button>
    </>
  );
};
