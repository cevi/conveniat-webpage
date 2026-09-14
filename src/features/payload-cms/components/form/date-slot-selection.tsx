'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import type { DateSlotSelectionBlock } from '@/features/payload-cms/components/form/types';
import type { DateSlot } from '@/features/payload-cms/components/form/utils/date-slots';
import { generateDateSlots } from '@/features/payload-cms/components/form/utils/date-slots';
import { RESSORT_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CalendarX } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useMemo } from 'react';
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

const noSlotsText: StaticTranslationString = {
  de: 'Zurzeit sind keine Zeitfenster verfügbar.',
  en: 'No time slots are available at the moment.',
  fr: "Aucun créneau n'est disponible pour le moment.",
};

const slotLengthSuffix: StaticTranslationString = {
  de: 'Tage',
  en: 'days',
  fr: 'jours',
};

const slotLengthSuffixSingular: StaticTranslationString = {
  de: 'Tag',
  en: 'day',
  fr: 'jour',
};

const ressortPlaceholder: StaticTranslationString = {
  de: 'Bitte auswählen',
  en: 'Please select',
  fr: 'Veuillez choisir',
};

/**
 * Formats the inclusive day range of a slot for display, in the reader's locale.
 *
 * The ISO days are parsed back through `Date.UTC` rather than `new Date(iso)` so the
 * rendered day never slips by one for readers west of UTC.
 */
const formatSlotRange = (slot: DateSlot, locale: Locale): string => {
  const format = (isoDay: string): string => {
    const [year, month, day] = isoDay.split('-').map(Number);
    if (year === undefined || month === undefined || day === undefined) return isoDay;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  return `${format(slot.startDate)} – ${format(slot.endDate)}`;
};

/**
 * Lets a helper who cannot commit to a whole camp phase pick a fixed-length window of
 * consecutive days instead of a concrete job, optionally together with the Ressort they
 * would like to help in.
 *
 * The block renders two form fields: the slot under `name`, and — when the editor filled
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
  slotLength,
  stepDays,
  ressortName,
  ressortLabel,
  ressortRequired,
}) => {
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;

  const slots = useMemo(
    () => generateDateSlots({ startDate, endDate, slotLength, stepDays }),
    [startDate, endDate, slotLength, stepDays],
  );

  const slotLengthInDays = slots[0] === undefined ? 0 : countDays(slots[0]);

  const ressortOptions = useMemo(
    () => RESSORT_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
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
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-50 p-6">
                  <CalendarX className="h-12 w-12 text-gray-400" />
                </div>
                <p className="max-w-[280px] text-sm text-gray-500">{noSlotsText[locale]}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3">
                {slots.map((slot) => {
                  const isSelected = value === slot.value;
                  const hasError = !!error;

                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (onChange as (v: any) => void)(slot.value);
                      }}
                      className={cn(
                        'relative flex cursor-pointer flex-col rounded-lg border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                        {
                          'border-green-600 bg-green-50 ring-green-600': isSelected && !hasError,
                          'border-red-500 bg-red-50 ring-red-600': isSelected && hasError,
                          'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus:ring-green-600':
                            !isSelected && !hasError,
                          'border-red-200 bg-white hover:border-red-300 focus:ring-red-500':
                            !isSelected && hasError,
                        },
                      )}
                    >
                      <span className="font-heading text-sm leading-tight font-bold text-gray-900">
                        {formatSlotRange(slot, locale)}
                      </span>
                      <span className="mt-2 text-[10px] font-medium tracking-tight text-gray-400 uppercase">
                        {slotLengthInDays}{' '}
                        {slotLengthInDays === 1
                          ? slotLengthSuffixSingular[locale]
                          : slotLengthSuffix[locale]}
                      </span>
                      {isSelected && (
                        <div
                          className={cn(
                            'absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm',
                            { 'bg-green-600': !hasError, 'bg-red-600': hasError },
                          )}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
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
                  <option value="">{ressortPlaceholder[locale]}</option>
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

/** Inclusive day count of a slot, derived from the slot itself so it survives a bad config. */
function countDays(slot: DateSlot): number {
  const start = Date.parse(`${slot.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${slot.endDate}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}
