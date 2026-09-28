'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { MaterialListBlock } from '@/features/payload-cms/components/form/types';
import {
  isAllowedQuantity,
  MATERIAL_LIST_MAX_QUANTITY,
  materialStep,
  parseMaterialAnswer,
  serializeMaterialAnswer,
  stepQuantity,
} from '@/features/payload-cms/components/form/utils/material-list';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Minus, Plus } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useId, useMemo, useRef, useState } from 'react';
import { useController, useFormContext, type FieldError } from 'react-hook-form';

const texts = {
  invalidQuantity: {
    de: 'Eine ganze Zahl von 0 bis {max}',
    en: 'A whole number from 0 to {max}',
    fr: 'Un nombre entier de 0 à {max}',
  },
  invalidStep: {
    de: 'Ein Vielfaches von {step}, höchstens {max}',
    en: 'A multiple of {step}, at most {max}',
    fr: 'Un multiple de {step}, au plus {max}',
  },
  inSteps: {
    de: 'in {step}er-Schritten',
    en: 'in steps of {step}',
    fr: 'par {step}',
  },
  fixQuantities: {
    de: 'Bitte korrigiere die markierten Mengen.',
    en: 'Please correct the marked quantities.',
    fr: 'Corrige les quantités signalées.',
  },
  ordered: {
    de: '{n} von {total} Materialien bestellt',
    en: '{n} of {total} materials ordered',
    fr: '{n} matériels sur {total} commandés',
  },
  less: { de: 'Weniger {name}', en: 'Less {name}', fr: 'Moins de {name}' },
  more: { de: 'Mehr {name}', en: 'More {name}', fr: 'Plus de {name}' },
} satisfies Record<string, StaticTranslationString>;

/** How each language writes a large number, e.g. 10'000 in Swiss German. */
const NUMBER_LOCALES: Record<Locale, string> = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** A number as typed: Swiss thousands marks and spaces are fine, an empty field is 0. */
const parseNumber = (typed: string): number | undefined => {
  const digits = typed.replaceAll(/['’\s]/g, '');
  if (digits === '') return 0;
  return /^\d+$/.test(digits) ? Number(digits) : undefined;
};

/** A quantity as typed, or undefined when the line does not take it. */
const parseTyped = (typed: string, step: number): number | undefined => {
  const quantity = parseNumber(typed);
  return quantity !== undefined && isAllowedQuantity(quantity, step) ? quantity : undefined;
};

interface Line {
  id: string;
  name: string;
  section: string | undefined;
  step: number;
}

/**
 * Asks a quantity for every material an editor listed, grouped under the lines' sections. The
 * answer is the ordered lines as text, so it travels like every other form answer; a material
 * left at 0 is not part of it.
 *
 * What is typed stays as typed until it is a quantity, so "2.5" is flagged, not read as 25.
 */
export const MaterialList: React.FC<MaterialListBlock & { error?: FieldError }> = ({
  name,
  label,
  required = false,
  items,
  error,
}) => {
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;
  const { control } = useFormContext();
  const lines = useMemo<Line[]>(
    () =>
      (items ?? []).flatMap((item) =>
        typeof item.id === 'string'
          ? [
              {
                id: item.id,
                name: item.name,
                section: item.section ?? undefined,
                step: materialStep(item.step),
              },
            ]
          : [],
      ),
    [items],
  );

  // two material lists of the same name can be open at once, e.g. in two dashboard cards
  const idPrefix = useId();
  const invalidCount = useRef(0);
  const { field } = useController({
    name,
    control,
    rules: {
      validate: (value: unknown) => {
        if (invalidCount.current > 0) return texts.fixQuantities[locale];
        if (required && (parseMaterialAnswer(value) ?? []).length === 0) {
          return fieldIsRequiredText[locale];
        }
        return true;
      },
    },
  });

  // what is typed, by line; seeded from the answer, e.g. the order handed in last time
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (parseMaterialAnswer(field.value) ?? []).map((line) => [line.id, String(line.quantity)]),
    ),
  );

  const update = (next: Record<string, string>): void => {
    setTyped(next);
    const quantities = lines.map((line) => ({
      line,
      quantity: parseTyped(next[line.id] ?? '', line.step),
    }));
    invalidCount.current = quantities.filter(({ quantity }) => quantity === undefined).length;
    field.onChange(
      serializeMaterialAnswer(
        quantities.map(({ line, quantity }) => ({ id: line.id, quantity: quantity ?? 0 })),
      ),
    );
  };

  // from a quantity off the line's steps, e.g. 7 in steps of 5, onto the next step
  const step = (line: Line, direction: 1 | -1): void => {
    const current = parseNumber(typed[line.id] ?? '') ?? 0;
    const next = stepQuantity(current, line.step, direction);
    update({ ...typed, [line.id]: next === 0 ? '' : String(next) });
  };

  const sections = useMemo(() => {
    const grouped: { section: string | undefined; lines: Line[] }[] = [];
    for (const line of lines) {
      const last = grouped.at(-1);
      if (last !== undefined && last.section === line.section) last.lines.push(line);
      else grouped.push({ section: line.section, lines: [line] });
    }
    return grouped;
  }, [lines]);

  const orderedCount = lines.filter(
    (line) => (parseTyped(typed[line.id] ?? '', line.step) ?? 0) > 0,
  ).length;
  const stepButton =
    'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <fieldset className="mb-4">
      <legend className="font-body mb-1 block text-sm font-medium text-gray-500">
        {label}
        {required && <Required />}
      </legend>
      <div className="space-y-5">
        {sections.map(({ section, lines: sectionLines }, index) => (
          <div key={section ?? `section-${index}`}>
            {section !== undefined && section !== '' && (
              <h4 className="font-body mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {section}
              </h4>
            )}
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {sectionLines.map((line) => {
                const value = typed[line.id] ?? '';
                const quantity = parseTyped(value, line.step);
                const invalid = quantity === undefined;
                const inputId = `${idPrefix}-${line.id}`;
                const hintId = `${inputId}-hint`;
                const stepsId = `${inputId}-steps`;
                const most = stepQuantity(MATERIAL_LIST_MAX_QUANTITY, line.step, 1);
                const describedBy = [line.step > 1 ? stepsId : '', invalid ? hintId : '']
                  .filter((id) => id !== '')
                  .join(' ');
                return (
                  <li key={line.id} className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={inputId}
                          className={cn(
                            'font-body block text-sm break-words',
                            (quantity ?? 0) > 0 ? 'font-semibold text-gray-900' : 'text-gray-700',
                          )}
                        >
                          {line.name}
                        </label>
                        {line.step > 1 && (
                          <span id={stepsId} className="font-body block text-xs text-gray-500">
                            {fill(texts.inSteps[locale], { step: line.step })}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className={stepButton}
                          disabled={(quantity ?? 0) === 0}
                          aria-label={fill(texts.less[locale], { name: line.name })}
                          onClick={() => step(line, -1)}
                        >
                          <Minus className="h-4 w-4" aria-hidden />
                        </button>
                        <input
                          id={inputId}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="0"
                          value={value}
                          aria-invalid={invalid}
                          aria-describedby={describedBy === '' ? undefined : describedBy}
                          onChange={(event) => update({ ...typed, [line.id]: event.target.value })}
                          className={cn(
                            'font-body h-10 w-20 rounded-md border-0 bg-green-100 px-3 text-right text-base text-gray-600 tabular-nums shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:outline-none focus:ring-inset',
                            invalid
                              ? 'bg-red-50 ring-red-500'
                              : 'focus:ring-conveniat-green ring-transparent',
                          )}
                        />
                        <button
                          type="button"
                          className={stepButton}
                          disabled={(quantity ?? 0) >= most}
                          aria-label={fill(texts.more[locale], { name: line.name })}
                          onClick={() => step(line, 1)}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    {invalid && (
                      <p id={hintId} className="mt-1 text-right text-xs text-red-600">
                        {fill(texts[line.step > 1 ? 'invalidStep' : 'invalidQuantity'][locale], {
                          step: line.step,
                          max: most.toLocaleString(NUMBER_LOCALES[locale]),
                        })}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="font-body mt-3 text-sm text-gray-500" aria-live="polite">
        {fill(texts.ordered[locale], { n: orderedCount, total: lines.length })}
      </p>
      {error?.message !== undefined && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </fieldset>
  );
};
