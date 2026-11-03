'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check } from 'lucide-react';
import type React from 'react';
import type { Control, Validate } from 'react-hook-form';
import { Controller } from 'react-hook-form';

/** One answer of a {@link VisitDayChoiceList}. */
export interface VisitDayChoice {
  value: string;
  label: string;
  /** a line under the label, such as the free places */
  sub?: React.ReactNode;
  /** no longer to be had, e.g. without enough free places; a chosen one stays visible */
  disabled?: boolean;
}

/**
 * A required single choice of the Besuchstag field: rows in one card, the chosen one tinted.
 * Unlike the form's radio buttons, a row can be disabled, so a choice without enough free
 * places shows but cannot be taken.
 */
export const VisitDayChoiceList: React.FC<{
  control: Control;
  name: string;
  legend: string;
  choices: VisitDayChoice[];
  /** checks the chosen value once more, e.g. against places that ran out after choosing it */
  validate?: Validate<unknown, unknown>;
  /** called with the new value after it is stored */
  onChosen?: (value: string) => void;
}> = ({ control, name, legend, choices, validate, onChosen }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <Controller
      control={control}
      name={name}
      defaultValue=""
      rules={{
        required: fieldIsRequiredText[locale],
        ...(validate === undefined ? {} : { validate }),
      }}
      render={({ field: { onChange, value }, fieldState }) => (
        <fieldset className="m-0 mb-4 border-0 p-0">
          <legend className="font-body mb-1 block text-sm font-medium text-gray-500">
            {legend}
            <Required />
          </legend>
          <div
            className={cn(
              'divide-line overflow-hidden rounded-[14px] border bg-white',
              fieldState.error === undefined ? 'border-line divide-y' : 'border-danger divide-y',
            )}
          >
            {choices.map((choice) => {
              const isChosen = value === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={isChosen}
                  disabled={choice.disabled === true && !isChosen}
                  onClick={() => {
                    onChange(choice.value);
                    onChosen?.(choice.value);
                  }}
                  className={cn(
                    'focus-visible:focus-row relative block min-h-11 w-full cursor-pointer px-4 py-3 text-left text-[15px] disabled:cursor-not-allowed disabled:opacity-60',
                    isChosen && 'bg-tint',
                  )}
                >
                  <span className="text-heading flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                        isChosen
                          ? 'border-conveniat-green bg-conveniat-green text-white'
                          : 'border-green-500',
                      )}
                    >
                      {isChosen && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {choice.label}
                  </span>
                  {choice.sub !== undefined && (
                    <span className="mt-1 block pl-7 text-sm">{choice.sub}</span>
                  )}
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
  );
};
