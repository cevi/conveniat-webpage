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

// Both answers look the same on purpose: declining must be as easy as accepting.
const buttonClassName =
  'font-heading transform cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]';

export const AcceptCookieEntrypointComponent: React.FC<{
  locale: 'de' | 'fr' | 'en';
  callback: () => void;
}> = ({ locale, callback }) => {
  const asksForAnalytics = isPostHogConfigured();

  const answer = (consent: AnalyticsConsent): void => {
    setAnalyticsConsent(consent);
    callback();
  };

  return (
    <>
      <p className="mb-8 text-lg text-balance text-gray-700">
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
        <button onClick={() => answer('denied')} className={buttonClassName}>
          {asksForAnalytics ? necessaryCookiesOnlyText[locale] : acknowledgeCookiesText[locale]}
        </button>
        {asksForAnalytics && (
          <button onClick={() => answer('granted')} className={buttonClassName}>
            {acceptAnalyticsText[locale]}
          </button>
        )}
      </div>
    </>
  );
};
