'use client';

import type { Locale } from '@/types/types';
import { useField, useLocale } from '@payloadcms/ui';
import type { CheckboxFieldClientProps } from 'payload';
import React from 'react';

// Extend the props to include label which might not be strictly typed in client props for all versions but is passed
type ExtendedCheckboxProperties = CheckboxFieldClientProps & {
  label?: string | Record<string, string>;
};

/**
 * Payload labels and descriptions are either a plain string or a localized
 * record such as `{ en: '…', de: '…', fr: '…' }`. Rendering the record directly
 * crashes React ("Objects are not valid as a React child"), so resolve it
 * against the active admin locale first.
 *
 * Anything that is not renderable text (a description function or a custom
 * component) yields `undefined` so the caller can skip it.
 */
export const resolveLocalizedText = (value: unknown, locale: Locale): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return undefined;

  const record = value as Record<string, unknown>;
  const candidate = record[locale] ?? record['en'] ?? Object.values(record)[0];

  return typeof candidate === 'string' ? candidate : undefined;
};

export const FeatureFlagToggle: React.FC<ExtendedCheckboxProperties> = ({
  path,
  label: labelProperties,
  field,
}) => {
  const { value, setValue } = useField<boolean>({ path });
  const { code } = useLocale();
  const locale = code as Locale;

  const label =
    resolveLocalizedText(labelProperties, locale) ??
    resolveLocalizedText(field.label, locale) ??
    field.name;

  const description = resolveLocalizedText(field.admin?.description, locale);

  return (
    <div className="m-2 flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
      <div className="space-y-0.5">
        <label className="text-base font-medium text-gray-900 dark:text-gray-100">{label}</label>
        {description !== undefined && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event_) => setValue(event_.target.checked)}
        className="h-6 w-11 rounded-full border-gray-300 transition-colors focus:ring-green-500"
        style={{ transform: 'scale(1.5)' }}
      />
    </div>
  );
};
