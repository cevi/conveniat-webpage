'use client';

import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Calendar, FilterX } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface NoProgramPlaceholderProperties {
  currentDate: Date;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const noEventsText: StaticTranslationString = {
  en: 'There are no scheduled events for',
  de: 'Es sind keine Veranstaltungen geplant für',
  fr: "Il n'y a pas d'événements prévus pour",
};

const noMatchingEventsText: StaticTranslationString = {
  en: 'No events match your filters for',
  de: 'Keine Veranstaltungen entsprechen deinen Filtern für',
  fr: 'Aucun événement ne correspond à vos filtres pour',
};

const checkOtherDatesText: StaticTranslationString = {
  en: 'Please check other dates for scheduled activities.',
  de: 'Bitte überprüfe andere Daten für geplante Aktivitäten.',
  fr: "Veuillez vérifier d'autres dates pour les activités programmées.",
};

const clearFiltersText: StaticTranslationString = {
  en: 'Clear Filters',
  de: 'Filter zurücksetzen',
  fr: 'Effacer les filtres',
};

const noProgramAvailableText: StaticTranslationString = {
  en: 'No Program Available',
  de: 'Kein Programm verfügbar',
  fr: 'Aucun programme disponible',
};

const noMatchingResultsText: StaticTranslationString = {
  en: 'No Matching Results',
  de: 'Keine Treffer',
  fr: 'Aucun résultat correspondant',
};

export const NoProgramPlaceholder: React.FC<NoProgramPlaceholderProperties> = ({
  currentDate,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const formattedDate = currentDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        {hasActiveFilters ? (
          <FilterX className="h-8 w-8 text-gray-400" />
        ) : (
          <Calendar className="h-8 w-8 text-gray-400" />
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {hasActiveFilters ? noMatchingResultsText[locale] : noProgramAvailableText[locale]}
      </h3>
      <p className="max-w-sm text-sm text-gray-600">
        {hasActiveFilters ? noMatchingEventsText[locale] : noEventsText[locale]}{' '}
        <span className="font-medium text-gray-900">{formattedDate}</span>.
      </p>

      {hasActiveFilters && onClearFilters ? (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4 h-9">
          <FilterX className="mr-2 h-4 w-4" />
          {clearFiltersText[locale]}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-gray-400">{checkOtherDatesText[locale]}</p>
      )}
    </div>
  );
};
