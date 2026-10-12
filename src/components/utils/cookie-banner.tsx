'use client';

import {
  acceptAnalyticsText,
  acknowledgeCookiesText,
  analyticsConsentText,
  learnMoreText,
  necessaryCookiesOnlyText,
  necessaryCookiesText,
  privacyPolicyPath,
} from '@/components/utils/cookie-consent-texts';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { isPostHogConfigured } from '@/lib/posthog-client';
import type { Locale } from '@/types/types';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import Link from 'next/link';
import type React from 'react';

// Both answers look the same on purpose: declining must be as easy as accepting.
const buttonClassName = 'cursor-pointer rounded-sm bg-white px-3 py-2 font-semibold text-gray-800';

export const CookieBanner: React.FC<{ locale: Locale }> = ({ locale }) => {
  const consent = useAnalyticsConsent();

  if (consent !== 'unanswered') {
    return <></>;
  }

  const asksForAnalytics = isPostHogConfigured();

  // Sit above the fixed header (z-[100]), which also holds the desktop side panel.
  return (
    <div className="fixed right-0 bottom-0 left-0 z-[110] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-800 px-4 py-2 text-white shadow-lg">
        <span className="flex-1 basis-64">
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
        </span>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAnalyticsConsent('denied')} className={buttonClassName}>
            {asksForAnalytics ? necessaryCookiesOnlyText[locale] : acknowledgeCookiesText[locale]}
          </button>
          {asksForAnalytics && (
            <button onClick={() => setAnalyticsConsent('granted')} className={buttonClassName}>
              {acceptAnalyticsText[locale]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
