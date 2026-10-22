'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { isPostHogConfigured } from '@/lib/posthog-client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import type React from 'react';

const analyticsSettingsTitle: StaticTranslationString = {
  en: 'Session recordings',
  de: 'Sitzungsaufzeichnungen',
  fr: 'Enregistrements de session',
};

const analyticsSettingsSubtitle: StaticTranslationString = {
  en: 'Usage analysis with PostHog',
  de: 'Nutzungsanalyse mit PostHog',
  fr: "Analyse de l'utilisation avec PostHog",
};

/**
 * Lets a person grant or withdraw the analytics consent they gave during onboarding. Renders
 * nothing on a deployment without PostHog.
 */
export const AnalyticsSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const consent = useAnalyticsConsent();

  if (!isPostHogConfigured()) {
    return <></>;
  }

  return (
    <SettingsRow
      title={analyticsSettingsTitle[locale]}
      subtitle={analyticsSettingsSubtitle[locale]}
      action={
        <Switch
          checked={consent === 'granted'}
          onCheckedChange={(checked) => setAnalyticsConsent(checked ? 'granted' : 'denied')}
          aria-label={analyticsSettingsTitle[locale]}
        />
      }
    />
  );
};
