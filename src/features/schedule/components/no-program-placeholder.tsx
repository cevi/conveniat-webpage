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
    <div className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-xs">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute -inset-2 rounded-full bg-linear-to-tr from-green-500/20 via-emerald-400/15 to-blue-500/20 blur-lg" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md">
          {hasActiveFilters ? (
            <FilterX className="text-conveniat-green h-8 w-8" />
          ) : (
            <Calendar className="text-conveniat-green h-8 w-8" />
          )}
        </div>
      </div>

      <h3 className="font-heading text-base font-bold text-gray-900">
        {hasActiveFilters ? noMatchingResultsText[locale] : noProgramAvailableText[locale]}
      </h3>

      <p className="font-body mt-1 max-w-xs text-xs leading-relaxed text-balance text-gray-500">
        {hasActiveFilters ? noMatchingEventsText[locale] : noEventsText[locale]}{' '}
        <span className="font-semibold text-gray-800">{formattedDate}</span>.
      </p>

      {hasActiveFilters && onClearFilters ? (
        <Button
          onClick={onClearFilters}
          className="bg-conveniat-green font-heading mt-4 cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-green-600 hover:shadow-md"
        >
          <FilterX className="mr-1.5 h-3.5 w-3.5" />
          {clearFiltersText[locale]}
        </Button>
      ) : (
        <p className="font-body mt-3 text-xs text-gray-400">{checkOtherDatesText[locale]}</p>
      )}
    </div>
  );
};
