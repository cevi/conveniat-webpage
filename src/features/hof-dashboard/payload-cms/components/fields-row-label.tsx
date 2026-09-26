'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}T/;

/** A date field's value as the Höfe read it, any other value as it is. */
const show = (value: unknown): string | undefined => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string' || value === '') return undefined;
  if (!DATE_ONLY.test(value)) return value;
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich' }).format(new Date(value));
};

/**
 * Names an array row of the Hof dashboard after its own fields, e.g. "31.1.2027 · 1. Abgabe
 * Grobkonzept", so a list of collapsed rows still says what each one is.
 */
export const FieldsRowLabel: React.FC<{ fields: string[] }> = ({ fields }) => {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>();
  const parts = fields.map((field) => show(data[field])).filter((part) => part !== undefined);
  return (
    <span>
      {parts.length > 0 ? parts.join(' · ') : String((rowNumber ?? 0) + 1).padStart(2, '0')}
    </span>
  );
};
