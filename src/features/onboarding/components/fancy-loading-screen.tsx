import { acceptCookiesText, cookieInfoText } from '@/features/onboarding/onboarding-constants';
import React from 'react';

export const FancyLoadingScreen: React.FC<{ locale?: 'de' | 'fr' | 'en' }> = ({
  locale = 'en',
}) => {
  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Invisible Spacer to perfect match AcceptCookie card height */}
      <div className="invisible flex flex-col items-center">
        <p className="mb-8 text-lg text-balance text-gray-700">{cookieInfoText[locale]}</p>
        <button className="font-heading transform rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md">
          {acceptCookiesText[locale]}
        </button>
      </div>

      {/* Actual Loading Bar Centered Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-gray-100">
          <div className="animate-loading absolute top-0 left-0 h-full w-1/2 rounded-full bg-red-700"></div>
        </div>
      </div>
    </div>
  );
};
