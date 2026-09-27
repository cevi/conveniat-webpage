'use client';

import type { StaticTranslationString } from '@/types/types';
import { Pill, useLocale, useRowLabel, useTranslation } from '@payloadcms/ui';
import type React from 'react';

const NOT_TRANSLATED: StaticTranslationString = {
  de: 'nicht übersetzt',
  en: 'not translated',
  fr: 'non traduit',
};

/** How Payload hands over a date field: an ISO date and time. */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;

/** A date field's value as the Höfe read it, any other value as it is. */
const show = (value: unknown): string | undefined => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string' || value === '') return undefined;
  if (!ISO_DATE_TIME.test(value)) return value;
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich' }).format(new Date(value));
};

/**
 * Names an array row of the Hof dashboard after its own fields, e.g. "31.1.2027 · 1. Abgabe
 * Grobkonzept", so a list of collapsed rows still says what each one is.
 */
export const FieldsRowLabel: React.FC<{ fields: string[] }> = ({ fields }) => {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>();
  const locale = useLocale();
  const { i18n } = useTranslation();
  const parts = fields.map((field) => show(data[field])).filter((part) => part !== undefined);
  if (parts.length > 0) return <span>{parts.join(' · ')}</span>;

  const number = String((rowNumber ?? 0) + 1).padStart(2, '0');
  // in French or English, an empty row is one still waiting for its translation
  if (locale.code === 'de') return <span>{number}</span>;
  const language = i18n.language as keyof StaticTranslationString;
  return (
    <span className="flex items-center gap-2">
      {number}
      <Pill pillStyle="warning" size="small">
        {(NOT_TRANSLATED[language] as string | undefined) ?? NOT_TRANSLATED.de}
      </Pill>
    </span>
  );
};
