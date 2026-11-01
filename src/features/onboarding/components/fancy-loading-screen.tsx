import { Button } from '@/components/ui/buttons/button';
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

export const FancyLoadingScreen: React.FC<{ locale?: 'de' | 'fr' | 'en' }> = ({
  locale = 'en',
}) => {
  const asksForAnalytics = isPostHogConfigured();

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Invisible Spacer to perfect match AcceptCookie card height */}
      <div className="invisible flex w-full flex-col items-center">
        <p className="mb-8 text-[15px] leading-normal text-balance text-green-700">
          {asksForAnalytics ? analyticsConsentText[locale] : necessaryCookiesText[locale]}
        </p>
        {/* Same labels and widths as the cookie step, so a wrapped label reserves its height. */}
        <div
          className={cn('flex flex-col items-center gap-4', {
            'mx-auto w-full max-w-xs items-stretch': asksForAnalytics,
          })}
        >
          <Button size="touch" className="w-full">
            {asksForAnalytics ? necessaryCookiesOnlyText[locale] : acknowledgeCookiesText[locale]}
          </Button>
          {asksForAnalytics && (
            <Button size="touch" className="w-full">
              {acceptAnalyticsText[locale]}
            </Button>
          )}
        </div>
      </div>

      {/* Actual Loading Bar Centered Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-tint relative h-1.5 w-64 overflow-hidden rounded-full">
          <div className="animate-loading bg-conveniat-green absolute top-0 left-0 h-full w-1/2 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
