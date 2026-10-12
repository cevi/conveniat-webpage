import {
  acknowledgeCookiesText,
  analyticsConsentText,
  necessaryCookiesText,
} from '@/components/utils/cookie-consent-texts';
import { isPostHogConfigured } from '@/lib/posthog-client';
import React from 'react';

const buttonClassName =
  'font-heading transform rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md';

export const FancyLoadingScreen: React.FC<{ locale?: 'de' | 'fr' | 'en' }> = ({
  locale = 'en',
}) => {
  const asksForAnalytics = isPostHogConfigured();

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Invisible Spacer to perfect match AcceptCookie card height */}
      <div className="invisible flex flex-col items-center">
        <p className="mb-8 text-lg text-balance text-gray-700">
          {asksForAnalytics ? analyticsConsentText[locale] : necessaryCookiesText[locale]}
        </p>
        <div className="flex flex-col gap-4">
          <button className={buttonClassName}>{acknowledgeCookiesText[locale]}</button>
          {/* The cookie step stacks a second answer where it asks for analytics. */}
          {asksForAnalytics && (
            <button className={buttonClassName}>{acknowledgeCookiesText[locale]}</button>
          )}
        </div>
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
