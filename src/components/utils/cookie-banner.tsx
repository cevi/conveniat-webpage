'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const COOKIE_NAME = 'conveniat-cookie-banner';

const shouldShowCookieBanner = (): boolean => {
  return Cookies.get(COOKIE_NAME) !== 'true';
};

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(shouldShowCookieBanner());
  }, []);

  const acceptCookies = () => {
    Cookies.set(COOKIE_NAME, 'true');
    setShowBanner(false);
  };

  if (!showBanner) return <></>;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="rounded-lg bg-gray-800 px-4 py-2 font-bold text-white shadow-lg">
        THIS IS THE COOKIE BANNER
        <button onClick={acceptCookies} className="ml-4 rounded bg-white p-2 text-gray-500">
          Accept
        </button>
      </div>
    </div>
  );
};
