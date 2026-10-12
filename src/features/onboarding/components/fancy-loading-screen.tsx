import {
  acceptAnalyticsText,
  acknowledgeCookiesText,
  analyticsConsentText,
  necessaryCookiesOnlyText,
  necessaryCookiesText,
} from '@/components/utils/cookie-consent-texts';
import { isPostHogConfigured } from '@/lib/posthog-client';
import { cn } from '@/utils/tailwindcss-override';
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
      <div className="invisible flex w-full flex-col items-center">
        <p className="mb-8 text-lg text-balance text-gray-700">
          {asksForAnalytics ? analyticsConsentText[locale] : necessaryCookiesText[locale]}
        </p>
        {/* Same labels and widths as the cookie step, so a wrapped label reserves its height. */}
        <div
          className={cn('flex flex-col items-center gap-4', {
            'mx-auto w-full max-w-xs items-stretch': asksForAnalytics,
          })}
        >
          <button className={buttonClassName}>
            {asksForAnalytics ? necessaryCookiesOnlyText[locale] : acknowledgeCookiesText[locale]}
          </button>
          {asksForAnalytics && (
            <button className={buttonClassName}>{acceptAnalyticsText[locale]}</button>
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
