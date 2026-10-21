import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
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
import { OnboardingStepScreen } from '@/features/onboarding/components/onboarding-step';
import { isPostHogConfigured } from '@/lib/posthog-client';
import type { StaticTranslationString } from '@/types/types';
import type { AnalyticsConsent } from '@/utils/analytics-consent';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import Link from 'next/link';
import React from 'react';

const welcomeTitle: StaticTranslationString = {
  de: 'Willkommen',
  en: 'Welcome',
  fr: 'Bienvenue',
};

/**
 * The first step: the analytics question where PostHog is configured, otherwise the note that
 * the app needs cookies.
 */
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
    <OnboardingStepScreen
      visual={<ConveniatLogo className="h-24 w-24" />}
      title={welcomeTitle[locale]}
      description={
        asksForAnalytics ? (
          <>
            {analyticsConsentText[locale]}{' '}
            <Link
              href={privacyPolicyPath(locale)}
              className="text-conveniat-green font-semibold underline underline-offset-2"
            >
              {learnMoreText[locale]}
            </Link>
          </>
        ) : (
          necessaryCookiesText[locale]
        )
      }
      actions={
        asksForAnalytics ? (
          // Both answers weigh the same on purpose: declining must be as easy as accepting,
          // so neither is the one brand-green action of the step.
          <>
            <Button variant="outlined" size="touch" onClick={() => answer('denied')}>
              {necessaryCookiesOnlyText[locale]}
            </Button>
            <Button variant="outlined" size="touch" onClick={() => answer('granted')}>
              {acceptAnalyticsText[locale]}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="touch" onClick={() => answer('denied')}>
            {acknowledgeCookiesText[locale]}
          </Button>
        )
      }
    />
  );
};
