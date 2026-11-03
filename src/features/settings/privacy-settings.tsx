'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ListRow } from '@/components/ui/list-row';
import { privacyPolicyPath } from '@/components/utils/cookie-consent-texts';
import { AnalyticsSettings } from '@/features/settings/analytics-settings';
import { SettingsCard } from '@/features/settings/components/settings-row';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ChevronRight } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const privacyTitle: StaticTranslationString = {
  de: 'Datenschutz',
  en: 'Privacy',
  fr: 'Protection des données',
};

const privacyPolicyTitle: StaticTranslationString = {
  de: 'Datenschutzbestimmungen',
  en: 'Privacy policy',
  fr: 'Politique de confidentialité',
};

/**
 * "Datenschutz" in the help section: a row that opens a sheet with the consent to session
 * recordings and the way to the privacy policy that explains it.
 */
export const PrivacySettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ListRow
        onClick={() => setIsOpen(true)}
        className="text-[15px] leading-5 font-medium text-green-900"
      >
        <span className="min-w-0 flex-1">{privacyTitle[locale]}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      </ListRow>

      <BottomSheet open={isOpen} onOpenChange={setIsOpen} title={privacyTitle[locale]}>
        <SettingsCard>
          {/* renders nothing on a deployment without PostHog */}
          <AnalyticsSettings locale={locale} />
          <ListRow
            href={privacyPolicyPath(locale)}
            onClick={() => setIsOpen(false)}
            className="text-[15px] leading-5 font-medium text-green-900"
          >
            <span className="min-w-0 flex-1">{privacyPolicyTitle[locale]}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
          </ListRow>
        </SettingsCard>
      </BottomSheet>
    </>
  );
};
