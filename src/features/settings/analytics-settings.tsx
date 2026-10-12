'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { isPostHogConfigured } from '@/lib/posthog-client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { setAnalyticsConsent } from '@/utils/analytics-consent';
import { ChartNoAxesColumn } from 'lucide-react';
import type React from 'react';

const analyticsSettingsTitle: StaticTranslationString = {
  en: 'Usage analytics',
  de: 'Nutzungsanalyse',
  fr: "Analyse d'utilisation",
};

const analyticsSettingsSubtitle: StaticTranslationString = {
  en: 'Usage, errors and sessions with PostHog',
  de: 'Nutzung, Fehler und Sitzungen mit PostHog',
  fr: 'Utilisation, erreurs et sessions avec PostHog',
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
    <div className="px-6 py-4">
      <SettingsRow
        icon={ChartNoAxesColumn}
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
    </div>
  );
};
