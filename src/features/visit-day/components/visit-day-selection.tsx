'use client';

import { Select } from '@/features/payload-cms/components/form/select';
import type { VisitDaySelectionBlock } from '@/features/payload-cms/components/form/types';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import type {
  Control,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  UseFormRegister,
} from 'react-hook-form';
import { useWatch } from 'react-hook-form';

/** The free places are read again this often while the form is open. */
const PLACES_REFRESH_MS = 60_000;

const placeholderText: StaticTranslationString = {
  de: 'Hof auswählen',
  en: 'Select a Hof',
  fr: 'Choisir un Hof',
};

const loadingText: StaticTranslationString = {
  de: 'Höfe werden geladen …',
  en: 'Loading Höfe …',
  fr: 'Chargement des Hofs …',
};

const loadErrorText: StaticTranslationString = {
  de: 'Die Höfe konnten nicht geladen werden. Prüfe deine Verbindung.',
  en: 'The Höfe could not be loaded. Check your connection.',
  fr: 'Les Hofs n’ont pas pu être chargés. Vérifie ta connexion.',
};

const freePlacesTitle: StaticTranslationString = {
  de: 'Freie Plätze',
  en: 'Places left',
  fr: 'Places libres',
};

const yourDayText: StaticTranslationString = {
  de: 'Euer Besuchstag',
  en: 'Your visiting day',
  fr: 'Votre journée des visites',
};

const fullText: StaticTranslationString = {
  de: 'ausgebucht',
  en: 'fully booked',
  fr: 'complet',
};

const placesText = (free: number, locale: Locale): string => {
  const texts: Record<Locale, string> = {
    de: free === 1 ? '1 Platz frei' : `${free} Plätze frei`,
    en: free === 1 ? '1 place left' : `${free} places left`,
    fr: free === 1 ? '1 place libre' : `${free} places libres`,
  };
  return texts[locale];
};

/**
 * Lets relatives pick the Hof they visit. The day follows from the Hof's Quartier; the field
 * shows it next to the places every day has left, which the server checks again on sending.
 */
export const VisitDaySelection: React.FC<
  VisitDaySelectionBlock & {
    control: Control;
    registerAction: UseFormRegister<string & FieldValues>;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
  }
> = ({ name, label, required, control, registerAction, error }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hoefe = trpc.visitDay.getVisitDayHofList.useQuery(undefined, { refetchOnMount: true });
  const days = trpc.visitDay.getVisitDayList.useQuery(undefined, {
    refetchOnMount: true,
    refetchInterval: PLACES_REFRESH_MS,
  });
  const selectedHofId = useWatch({ control, name }) as unknown;
  const selectedDay = (hoefe.data ?? []).find((hof) => hof.id === selectedHofId)?.date;
  // without signal the query waits paused instead of failing
  const unavailable = hoefe.data === undefined && (hoefe.isError || hoefe.fetchStatus === 'paused');

  return (
    <div className="mb-4">
      <Select
        blockType="select"
        name={name}
        label={label ?? ''}
        required={required ?? false}
        control={control}
        registerAction={registerAction}
        {...(error === undefined ? {} : { error })}
        optionType="dropdown"
        allowMultiple={false}
        placeholder={
          unavailable
            ? loadErrorText[locale]
            : (hoefe.isLoading ? loadingText : placeholderText)[locale]
        }
        options={(hoefe.data ?? []).map((hof) => ({ value: hof.id, label: hof.name }))}
      />

      {days.data !== undefined && days.data.length > 0 && (
        <div className="border-line rounded-[14px] border bg-white">
          <p className="m-0 px-4 pt-3 text-xs font-semibold tracking-wide text-green-700 uppercase">
            {freePlacesTitle[locale]}
          </p>
          <ul className="divide-line m-0 list-none divide-y p-0">
            {days.data.map((day) => {
              const isOwnDay = day.date === selectedDay;
              return (
                <li
                  key={day.date}
                  aria-current={isOwnDay ? 'date' : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 text-[15px]',
                    isOwnDay && 'bg-tint',
                  )}
                >
                  <span className="text-heading">
                    {formatVisitDay(day.date, locale)}
                    {isOwnDay && (
                      <span className="block text-sm text-green-700">{yourDayText[locale]}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-sm',
                      day.free === 0 ? 'text-danger-text font-semibold' : 'text-green-700',
                    )}
                  >
                    {day.free === 0 ? fullText[locale] : placesText(day.free, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
