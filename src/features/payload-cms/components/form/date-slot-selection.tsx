'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import type { DateSlotSelectionBlock } from '@/features/payload-cms/components/form/types';
import type {
  DateRange,
  SelectableDays,
} from '@/features/payload-cms/components/form/utils/date-slots';
import {
  addDays,
  areRangesAllowed,
  countDays,
  getSelectableDays,
  parseDateRangesValue,
  toDateRangesValue,
  toIsoDay,
} from '@/features/payload-cms/components/form/utils/date-slots';
import { RESSORT_WISH_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CalendarX, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useMemo, useState } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

interface DateSlotSelectionProperties extends DateSlotSelectionBlock {
  control: Control<FieldValues>;
  renderMode?: 'all' | 'sidebar' | 'main';
}

const requiredFieldMessage: StaticTranslationString = {
  de: 'Dieses Feld ist erforderlich',
  en: 'This field is required',
  fr: 'Ce champ est obligatoire',
};

const noDaysText: StaticTranslationString = {
  de: 'Zurzeit können keine Tage ausgewählt werden.',
  en: 'No days can be selected at the moment.',
  fr: 'Aucun jour ne peut être sélectionné pour le moment.',
};

const dayCountSuffix: StaticTranslationString = {
  de: 'Tage',
  en: 'days',
  fr: 'jours',
};

const dayCountSuffixSingular: StaticTranslationString = {
  de: 'Tag',
  en: 'day',
  fr: 'jour',
};

const pickFirstDayText: StaticTranslationString = {
  de: 'Tippe auf deinen ersten Tag.',
  en: 'Tap your first day.',
  fr: 'Touche ton premier jour.',
};

const pickLastDayText: StaticTranslationString = {
  de: 'Tippe jetzt auf deinen letzten Tag',
  en: 'Now tap your last day',
  fr: 'Touche maintenant ton dernier jour',
};

const atLeastText: StaticTranslationString = {
  de: 'mindestens',
  en: 'at least',
  fr: 'au moins',
};

const atMostText: StaticTranslationString = {
  de: 'höchstens',
  en: 'at most',
  fr: 'au plus',
};

const pickAgainText: StaticTranslationString = {
  de: 'Tippe auf einen Tag, um neu zu wählen.',
  en: 'Tap a day to choose again.',
  fr: 'Touche un jour pour recommencer.',
};

const addAnotherRangeText: StaticTranslationString = {
  de: 'Optional: Tippe auf den ersten Tag eines weiteren Zeitfensters.',
  en: 'Optional: tap the first day of another slot.',
  fr: "Facultatif : touche le premier jour d'un autre créneau.",
};

const removeRangeText: StaticTranslationString = {
  de: 'Zeitfenster entfernen',
  en: 'Remove slot',
  fr: 'Retirer le créneau',
};

const ressortPlaceholder: StaticTranslationString = {
  de: 'Bitte auswählen',
  en: 'Please select',
  fr: 'Veuillez choisir',
};

/*
 * Appended to a day's accessible name, so a screen reader hears where the range starts and
 * ends instead of a row of independent "pressed" toggles.
 */
const firstDayMarker: StaticTranslationString = {
  de: 'erster Tag',
  en: 'first day',
  fr: 'premier jour',
};

const lastDayMarker: StaticTranslationString = {
  de: 'letzter Tag',
  en: 'last day',
  fr: 'dernier jour',
};

const inRangeMarker: StaticTranslationString = {
  de: 'ausgewählt',
  en: 'selected',
  fr: 'sélectionné',
};

/** A Monday, used to print the weekday column headers in the reader's locale. */
const FIRST_MONDAY = Date.UTC(2024, 0, 1);

interface CalendarMonth {
  key: string;
  /** Empty cells before the first day, for a week that starts on Monday. */
  leadingBlanks: number;
  /** Every day of the month as `YYYY-MM-DD`. */
  days: string[];
}

/**
 * Formats an ISO day in the reader's locale.
 *
 * The day is parsed back through `Date.UTC` rather than `new Date(iso)` so the rendered day
 * never slips by one for readers west of UTC.
 */
const formatIsoDay = (
  isoDay: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string => {
  const [year, month, day] = isoDay.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDay;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    ...options,
    timeZone: 'UTC',
  });
};

const formatDayCount = (days: number, locale: Locale): string =>
  `${days} ${days === 1 ? dayCountSuffixSingular[locale] : dayCountSuffix[locale]}`;

/**
 * Every calendar month touched by the selectable window, oldest first. The window itself is
 * capped in `getSelectableDays`, so this never has to cut months off.
 */
const buildMonths = (firstDay: string, lastDay: string): CalendarMonth[] => {
  const [firstYear, firstMonth] = firstDay.split('-').map(Number);
  const [lastYear, lastMonth] = lastDay.split('-').map(Number);
  if (
    firstYear === undefined ||
    firstMonth === undefined ||
    lastYear === undefined ||
    lastMonth === undefined
  ) {
    return [];
  }

  const months: CalendarMonth[] = [];
  let year = firstYear;
  let month = firstMonth;
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const monthStart = Date.UTC(year, month - 1, 1);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    months.push({
      key: `${year}-${month}`,
      leadingBlanks: (new Date(monthStart).getUTCDay() + 6) % 7,
      days: Array.from({ length: daysInMonth }, (_, dayIndex) =>
        toIsoDay(monthStart + dayIndex * 86_400_000),
      ),
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

interface DayRangeCalendarProperties {
  selectable: SelectableDays;
  value: unknown;
  onChange: (value: string) => void;
  label: string | undefined;
  locale: Locale;
}

/**
 * Month grids on which the helper taps a first and a last day, once per range.
 *
 * The form value only holds complete ranges; a first tap lives in local state until the
 * second one, so a half-picked range still fails the required check. While the helper may
 * add another range, a tap starts it next to the ones already marked. Once the limit is
 * reached, a tap starts over from scratch, which for a single range is plain "choose again".
 */
const DayRangeCalendar: React.FC<DayRangeCalendarProperties> = ({
  selectable,
  value,
  onChange,
  label,
  locale,
}) => {
  const [pendingStart, setPendingStart] = useState<string | undefined>();
  const selectedRanges = parseDateRangesValue(value) ?? [];
  const isAtLimit = selectedRanges.length >= selectable.maxRanges;
  // The ranges a new one has to fit around: none when the next tap starts over.
  const keptRanges = pendingStart === undefined && isAtLimit ? [] : selectedRanges;

  const fitsBeside = (range: DateRange): boolean =>
    areRangesAllowed(
      [...keptRanges, range].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      selectable,
    );

  const findRange = (day: string): DateRange | undefined =>
    selectedRanges.find((range) => day >= range.startDate && day <= range.endDate);

  const months = useMemo(
    () => buildMonths(selectable.firstDay, selectable.lastDay),
    [selectable.firstDay, selectable.lastDay],
  );

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        formatIsoDay(toIsoDay(FIRST_MONDAY + dayIndex * 86_400_000), locale, { weekday: 'short' }),
      ),
    [locale],
  );

  /** A day can start a range when the shortest range from it still fits. */
  const canStartOn = (day: string): boolean =>
    fitsBeside({ startDate: day, endDate: addDays(day, selectable.minDays - 1) });

  const isSelectable = (day: string): boolean => {
    if (pendingStart === undefined || day < pendingStart) return canStartOn(day);
    if (day === pendingStart) return true;
    return fitsBeside({ startDate: pendingStart, endDate: day });
  };

  const handleDayClick = (day: string): void => {
    if (pendingStart === undefined || day < pendingStart) {
      if (pendingStart === undefined && isAtLimit) onChange('');
      setPendingStart(day);
    } else if (day === pendingStart) {
      setPendingStart(undefined);
    } else {
      setPendingStart(undefined);
      onChange(toDateRangesValue([...selectedRanges, { startDate: pendingStart, endDate: day }]));
    }
  };

  const removeRange = (removed: DateRange): void => {
    setPendingStart(undefined);
    onChange(toDateRangesValue(selectedRanges.filter((range) => range !== removed)));
  };

  /** What a day is within a range, for its accessible name; undefined when outside all. */
  const getDayMarker = (day: string): string | undefined => {
    const range = findRange(day);
    if (day === pendingStart || day === range?.startDate) return firstDayMarker[locale];
    if (day === range?.endDate) return lastDayMarker[locale];
    if (range !== undefined) return inRangeMarker[locale];
    return undefined;
  };

  const lengthLimits = [
    `${atLeastText[locale]} ${formatDayCount(selectable.minDays, locale)}`,
    ...(selectable.maxDays === undefined
      ? []
      : [`${atMostText[locale]} ${formatDayCount(selectable.maxDays, locale)}`]),
  ].join(', ');

  const shortDate: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={label} className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
        {months.map((calendarMonth) => (
          <div key={calendarMonth.key}>
            <p className="font-heading mb-2 text-sm font-bold text-gray-900">
              {formatIsoDay(calendarMonth.days[0] ?? '', locale, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="grid grid-cols-7 gap-y-1">
              {weekdays.map((weekday) => (
                <span
                  key={weekday}
                  aria-hidden="true"
                  className="pb-1 text-center text-xs font-medium text-gray-400"
                >
                  {weekday}
                </span>
              ))}
              {Array.from({ length: calendarMonth.leadingBlanks }, (_, blankIndex) => (
                <span key={`blank-${blankIndex}`} aria-hidden="true" />
              ))}
              {calendarMonth.days.map((day) => {
                const range = findRange(day);
                const isEndpoint =
                  day === pendingStart || day === range?.startDate || day === range?.endDate;
                const isInRange = range !== undefined;
                const isEnabled = isSelectable(day);
                const marker = getDayMarker(day);
                const dayName = formatIsoDay(day, locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!isEnabled}
                    aria-label={marker === undefined ? dayName : `${dayName}, ${marker}`}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'flex h-10 items-center justify-center text-sm tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1',
                      {
                        'rounded-md bg-green-600 font-bold text-white': isEndpoint,
                        'bg-green-100 text-green-900': isInRange && !isEndpoint,
                        'cursor-pointer rounded-md text-gray-900 hover:bg-gray-100':
                          isEnabled && !isEndpoint && !isInRange,
                        'cursor-not-allowed text-gray-300': !isEnabled && !isEndpoint && !isInRange,
                      },
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div aria-live="polite" className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {pendingStart !== undefined && (
          <p>
            {pickLastDayText[locale]} ({lengthLimits}).
          </p>
        )}
        {selectedRanges.map((range) => {
          const rangeText = `${formatIsoDay(range.startDate, locale, shortDate)} – ${formatIsoDay(range.endDate, locale, shortDate)}`;
          return (
            <div key={range.startDate} className="flex items-center justify-between gap-2">
              <p className="font-bold text-gray-900">
                {rangeText} · {formatDayCount(countDays(range.startDate, range.endDate), locale)}
              </p>
              <button
                type="button"
                aria-label={`${removeRangeText[locale]}: ${rangeText}`}
                onClick={() => removeRange(range)}
                className="cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {pendingStart === undefined && selectedRanges.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {isAtLimit ? pickAgainText[locale] : addAnotherRangeText[locale]}
          </p>
        )}
        {pendingStart === undefined && selectedRanges.length === 0 && (
          <p>
            {pickFirstDayText[locale]} ({lengthLimits})
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Lets a helper who cannot commit to a whole camp phase mark the consecutive days they can
 * help on instead of a concrete job, optionally together with the Ressort they would like to
 * help in.
 *
 * The block renders two form fields: the day range under `name`, and — when the editor filled
 * in `ressortName` — the Ressort wish under that second name. Anything reading a form
 * definition field by field (step validation, initial state, server-side validation) has
 * to account for that second name explicitly.
 */
export const DateSlotSelection: React.FC<DateSlotSelectionProperties> = ({
  control,
  name,
  label,
  required,
  startDate,
  endDate,
  minDays,
  maxDays,
  maxRanges,
  ressortName,
  ressortLabel,
  ressortRequired,
}) => {
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;

  const selectable = useMemo(
    () => getSelectableDays({ startDate, endDate, minDays, maxDays, maxRanges }),
    [startDate, endDate, minDays, maxDays, maxRanges],
  );

  const ressortOptions = useMemo(
    () =>
      RESSORT_WISH_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
    [locale],
  );

  const asksForRessort = typeof ressortName === 'string' && ressortName !== '';

  return (
    <div className="@container mb-4 w-full">
      <label className="font-body mb-4 block text-sm font-bold text-gray-900">
        {label}
        {Boolean(required) && <Required />}
      </label>

      <Controller
        control={control}
        name={name}
        rules={{ required: required === true ? requiredFieldMessage[locale] : false }}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <div className="flex flex-col gap-4">
            {selectable === undefined ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-50 p-6">
                  <CalendarX className="h-12 w-12 text-gray-400" />
                </div>
                <p className="max-w-[280px] text-sm text-gray-500">{noDaysText[locale]}</p>
              </div>
            ) : (
              <DayRangeCalendar
                selectable={selectable}
                value={value as unknown}
                onChange={(nextValue) => (onChange as (value: string) => void)(nextValue)}
                label={label}
                locale={locale}
              />
            )}
            {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
          </div>
        )}
      />

      {asksForRessort && (
        <div className="mt-6">
          <label
            className="font-body mb-1 block text-sm font-medium text-gray-500"
            htmlFor={ressortName}
          >
            {ressortLabel}
            {ressortRequired === true && <Required />}
          </label>
          <Controller
            control={control}
            name={ressortName}
            defaultValue=""
            rules={{
              required: ressortRequired === true ? requiredFieldMessage[locale] : false,
            }}
            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
              <>
                <select
                  id={ressortName}
                  ref={ref}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => onChange(event.target.value)}
                  className={cn(
                    'font-body min-h-10 w-full cursor-pointer rounded-md border-0 px-3 py-2 text-base text-gray-600 shadow-sm ring-1 transition-all duration-200 ring-inset',
                    error
                      ? 'bg-red-50 ring-red-500'
                      : 'bg-green-100 ring-transparent hover:ring-green-600 focus:ring-2 focus:ring-green-600',
                  )}
                >
                  {/* A prompt, not an answer: shown until the helper picks, never pickable. */}
                  <option value="" disabled>
                    {ressortPlaceholder[locale]}
                  </option>
                  {ressortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
              </>
            )}
          />
        </div>
      )}
    </div>
  );
};
