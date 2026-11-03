'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import { Select } from '@/features/payload-cms/components/form/select';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { VisitDaySelectionBlock } from '@/features/payload-cms/components/form/types';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import { EXTERNAL_VISIT, WITH_LUNCH, WITHOUT_LUNCH } from '@/features/visit-day/visit-day-choices';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check } from 'lucide-react';
import type React from 'react';
import type {
  Control,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  UseFormRegister,
} from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';

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

const noHofOptionText: StaticTranslationString = {
  de: 'Kein Bezug zu einem Hof',
  en: 'No connection to a Hof',
  fr: 'Aucun lien avec un Hof',
};

const lunchLabelText: StaticTranslationString = {
  de: 'Mittagessen im Lager',
  en: 'Lunch at the camp',
  fr: 'Repas de midi au camp',
};

const withLunchOptionText: StaticTranslationString = {
  de: 'Ja, wir essen im Lager zu Mittag',
  en: 'Yes, we have lunch at the camp',
  fr: 'Oui, nous mangeons à midi au camp',
};

const withoutLunchOptionText: StaticTranslationString = {
  de: 'Nein, wir verpflegen uns selbst',
  en: 'No, we bring our own lunch',
  fr: 'Non, nous apportons notre repas',
};

const freePlacesTitle: StaticTranslationString = {
  de: 'Freie Plätze',
  en: 'Places left',
  fr: 'Places libres',
};

const chooseDayTitle: StaticTranslationString = {
  de: 'Besuchstag wählen',
  en: 'Choose the visiting day',
  fr: 'Choisir la journée des visites',
};

const yourDayText: StaticTranslationString = {
  de: 'Euer Besuchstag',
  en: 'Your visiting day',
  fr: 'Votre journée des visites',
};

const withLunchText: StaticTranslationString = {
  de: 'Mit Mittagessen',
  en: 'With lunch',
  fr: 'Avec repas',
};

const withoutLunchText: StaticTranslationString = {
  de: 'Ohne Mittagessen',
  en: 'Without lunch',
  fr: 'Sans repas',
};

const fullText: StaticTranslationString = {
  de: 'ausgebucht',
  en: 'fully booked',
  fr: 'complet',
};

const placesText = (free: number, locale: Locale): string => {
  if (free === 0) return fullText[locale];
  const texts: Record<Locale, string> = {
    de: free === 1 ? '1 Platz frei' : `${free} Plätze frei`,
    en: free === 1 ? '1 place left' : `${free} places left`,
    fr: free === 1 ? '1 place libre' : `${free} places libres`,
  };
  return texts[locale];
};

/** One day's places as the form shows them. */
interface DayPlaces {
  date: string;
  free: number;
  freeWithoutLunch: number;
}

/** The free places of one kind, as a line under the day: the kind left, the number right. */
const PlacesLine: React.FC<{ title: string | undefined; free: number; locale: Locale }> = ({
  title,
  free,
  locale,
}) => (
  <span className="flex justify-between gap-3 text-sm">
    <span className="text-green-700">{title}</span>
    <span className={free === 0 ? 'text-danger-text font-semibold' : 'text-green-700'}>
      {placesText(free, locale)}
    </span>
  </span>
);

/**
 * The free places of a day. Once the person chose with or without lunch, only that kind shows,
 * so nobody reads a number that is not theirs.
 */
const DayPlacesText: React.FC<{
  day: DayPlaces;
  asksLunch: boolean;
  lunch: unknown;
  locale: Locale;
}> = ({ day, asksLunch, lunch, locale }) => {
  if (!asksLunch) return <PlacesLine title={undefined} free={day.free} locale={locale} />;
  const showWith = lunch !== WITHOUT_LUNCH;
  const showWithout = lunch !== WITH_LUNCH;
  return (
    <span className="mt-1 block">
      {showWith && <PlacesLine title={withLunchText[locale]} free={day.free} locale={locale} />}
      {showWithout && (
        <PlacesLine title={withoutLunchText[locale]} free={day.freeWithoutLunch} locale={locale} />
      )}
    </span>
  );
};

/**
 * Lets relatives pick the Hof they visit. The day follows from the Hof's Quartier; the field
 * shows it next to the places every day has left, which the server checks again on sending.
 * A visitor without a Hof picks the day from that same list instead. Where the form asks about
 * lunch, the field asks it too, since each kind has places of its own.
 */
export const VisitDaySelection: React.FC<
  VisitDaySelectionBlock & {
    control: Control;
    registerAction: UseFormRegister<string & FieldValues>;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
  }
> = ({ name, label, required, dayField, lunchField, control, registerAction, error }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hoefe = trpc.visitDay.getVisitDayHofList.useQuery(undefined, { refetchOnMount: true });
  const days = trpc.visitDay.getVisitDayList.useQuery(undefined, {
    refetchOnMount: true,
    refetchInterval: PLACES_REFRESH_MS,
  });
  const asksLunch = typeof lunchField === 'string' && lunchField !== '';
  const [selectedHofId, lunch, pickedDay] = useWatch({
    control,
    name: [name, asksLunch ? lunchField : name, dayField],
  }) as [unknown, unknown, unknown];
  const isExternal = selectedHofId === EXTERNAL_VISIT;
  const ownDay = isExternal
    ? pickedDay
    : (hoefe.data ?? []).find((hof) => hof.id === selectedHofId)?.date;
  // without signal the query waits paused instead of failing
  const unavailable = hoefe.data === undefined && (hoefe.isError || hoefe.fetchStatus === 'paused');
  // a client restoring a cache from before the places without lunch has none for them
  const dayPlaces: DayPlaces[] = (days.data ?? []).map((day) => ({
    date: day.date,
    free: day.free,
    freeWithoutLunch: (day.freeWithoutLunch as number | undefined) ?? 0,
  }));
  const freeOfChosenKind = (day: DayPlaces): number =>
    asksLunch && lunch === WITHOUT_LUNCH ? day.freeWithoutLunch : day.free;

  const hofOptions = (hoefe.data ?? []).map((hof) => ({ value: hof.id, label: hof.name }));
  const options =
    hoefe.data === undefined
      ? hofOptions
      : [...hofOptions, { value: EXTERNAL_VISIT, label: noHofOptionText[locale] }];

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
        options={options}
      />

      {asksLunch && (
        <Select
          blockType="select"
          name={lunchField}
          label={lunchLabelText[locale]}
          required
          control={control}
          registerAction={registerAction}
          optionType="radio"
          allowMultiple={false}
          options={[
            { value: WITH_LUNCH, label: withLunchOptionText[locale] },
            { value: WITHOUT_LUNCH, label: withoutLunchOptionText[locale] },
          ]}
        />
      )}

      {dayPlaces.length > 0 && !isExternal && (
        <div className="border-line rounded-[14px] border bg-white">
          <p className="m-0 px-4 pt-3 text-xs font-semibold tracking-wide text-green-700 uppercase">
            {freePlacesTitle[locale]}
          </p>
          <ul className="divide-line m-0 list-none divide-y p-0">
            {dayPlaces.map((day) => {
              const isOwnDay = day.date === ownDay;
              return (
                <li
                  key={day.date}
                  aria-current={isOwnDay ? 'date' : undefined}
                  className={cn('px-4 py-3 text-[15px]', isOwnDay && 'bg-tint')}
                >
                  <span className="text-heading block font-medium">
                    {formatVisitDay(day.date, locale)}
                    {isOwnDay && (
                      <span className="block text-sm font-normal text-green-700">
                        {yourDayText[locale]}
                      </span>
                    )}
                  </span>
                  <DayPlacesText day={day} asksLunch={asksLunch} lunch={lunch} locale={locale} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dayPlaces.length > 0 && isExternal && (
        <Controller
          control={control}
          name={dayField}
          defaultValue=""
          rules={{ required: fieldIsRequiredText[locale] }}
          render={({ field: { onChange, value }, fieldState }) => (
            <fieldset className="m-0 border-0 p-0">
              <legend className="font-body mb-1 block text-sm font-medium text-gray-500">
                {chooseDayTitle[locale]}
                <Required />
              </legend>
              <div
                className={cn(
                  'divide-line overflow-hidden rounded-[14px] border bg-white',
                  fieldState.error === undefined
                    ? 'border-line divide-y'
                    : 'border-danger divide-y',
                )}
              >
                {dayPlaces.map((day) => {
                  const isPicked = value === day.date;
                  const isFull = freeOfChosenKind(day) === 0;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-pressed={isPicked}
                      disabled={isFull && !isPicked}
                      onClick={() => onChange(day.date)}
                      className={cn(
                        'focus-visible:focus-row relative block min-h-11 w-full cursor-pointer px-4 py-3 text-left text-[15px] disabled:cursor-not-allowed disabled:opacity-60',
                        isPicked && 'bg-tint',
                      )}
                    >
                      <span className="text-heading flex items-center gap-2 font-medium">
                        <span
                          aria-hidden
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                            isPicked
                              ? 'border-conveniat-green bg-conveniat-green text-white'
                              : 'border-green-500',
                          )}
                        >
                          {isPicked && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        {formatVisitDay(day.date, locale)}
                      </span>
                      <DayPlacesText
                        day={day}
                        asksLunch={asksLunch}
                        lunch={lunch}
                        locale={locale}
                      />
                    </button>
                  );
                })}
              </div>
              {fieldState.error !== undefined && (
                <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
              )}
            </fieldset>
          )}
        />
      )}
    </div>
  );
};
