'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Calendar } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface EnhancedNoProgramPlaceholderProperties {
  currentDate: Date;
}

const noEventsText: StaticTranslationString = {
  en: 'There are no scheduled events for',
  de: 'Es sind keine Veranstaltungen geplant für',
  fr: "Il n'y a pas d'événements prévus pour",
};

const checkOtherDatesText: StaticTranslationString = {
  en: 'Please check other dates for scheduled activities.',
  de: 'Bitte überprüfe andere Daten für geplante Aktivitäten.',
  fr: "Veuillez vérifier d'autres dates pour les activités programmées.",
};

const noProgramAvailableText: StaticTranslationString = {
  en: 'No Program Available',
  de: 'Kein Programm verfügbar',
  fr: 'Aucun programme disponible',
};

export const NoProgramPlaceholder: React.FC<EnhancedNoProgramPlaceholderProperties> = ({
  currentDate,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
      <>
        <Calendar className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">{noProgramAvailableText[locale]}</h3>
        <p className="text-gray-600">
          {noEventsText[locale]}{' '}
          {currentDate.toLocaleDateString(locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          .
        </p>
        <p className="mt-2 text-sm text-gray-500">{checkOtherDatesText[locale]}</p>
      </>
    </div>
  );
};
