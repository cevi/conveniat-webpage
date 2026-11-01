import { Button } from '@/components/ui/buttons/button';
import {
  acceptAnalyticsText,
  acknowledgeCookiesText,
  analyticsConsentText,
  learnMoreText,
  necessaryCookiesOnlyText,
  necessaryCookiesText,
  privacyPolicyPath,
} from '@/components/utils/cookie-consent-texts';
import { isPostHogConfigured } from '@/lib/posthog-client';
import type { AnalyticsConsent } from '@/utils/analytics-consent';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import { cn } from '@/utils/tailwindcss-override';
import Link from 'next/link';
import React from 'react';

export const AcceptCookieEntrypointComponent: React.FC<{
  locale: 'de' | 'fr' | 'en';
  callback: () => void;
}> = ({ locale, callback }) => {
  const asksForAnalytics = isPostHogConfigured();
  // A lone acknowledgement is the view's primary action. Two answers look the same on purpose:
  // declining must be as easy as accepting, so neither of them is the primary one.
  const buttonVariant = asksForAnalytics ? 'outlined' : 'primary';

  const answer = (consent: AnalyticsConsent): void => {
    setAnalyticsConsent(consent);
    callback();
  };

  return (
    <>
      <p className="mb-8 text-[15px] leading-normal text-balance text-green-700">
        {asksForAnalytics ? (
          <>
            {analyticsConsentText[locale]}{' '}
            <Link href={privacyPolicyPath(locale)} className="underline">
              {learnMoreText[locale]}
            </Link>
          </>
        ) : (
          necessaryCookiesText[locale]
        )}
      </p>

      {/* Stacked at one width: side by side they wrap on a phone and end up uneven. */}
      <div
        className={cn('flex flex-col items-center gap-4', {
          'mx-auto w-full max-w-xs items-stretch': asksForAnalytics,
        })}
      >
        <Button
          variant={buttonVariant}
          size="touch"
          className="w-full"
          onClick={() => answer('denied')}
        >
          {asksForAnalytics ? necessaryCookiesOnlyText[locale] : acknowledgeCookiesText[locale]}
        </Button>
        {asksForAnalytics && (
          <Button
            variant={buttonVariant}
            size="touch"
            className="w-full"
            onClick={() => answer('granted')}
          >
            {acceptAnalyticsText[locale]}
          </Button>
        )}
      </div>
    </>
  );
};
