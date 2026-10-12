'use client';

import { cookieSettingsText } from '@/components/utils/cookie-consent-texts';
import type { Locale } from '@/types/types';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import type React from 'react';

/**
 * Forgets the stored cookie answer, which stops analytics and brings the cookie banner back.
 */
export const CookieSettingsButton: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <button
      onClick={() => setAnalyticsConsent('unanswered')}
      className="mb-2 cursor-pointer text-xs underline"
    >
      {cookieSettingsText[locale]}
    </button>
  );
};
