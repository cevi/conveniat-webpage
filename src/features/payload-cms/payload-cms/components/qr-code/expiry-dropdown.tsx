import type { Locale, StaticTranslationString } from '@/types/types';
import type { ChangeEvent } from 'react';
import React from 'react';

const previewExpiryText: StaticTranslationString = {
  de: 'Gültigkeit',
  fr: 'Durée de validité',
  en: 'Expiry',
};
const previewMinutesText: StaticTranslationString = {
  de: 'Minuten',
  fr: 'Minutes',
  en: 'Minutes',
};
const previewHoursText: StaticTranslationString = {
  de: 'Stunden',
  fr: 'Heures',
  en: 'Hours',
};
const previewDaysText: StaticTranslationString = {
  de: 'Tage',
  fr: 'Jours',
  en: 'Days',
};

/**
 * Properties definition for the ExpiryDropdown component.
 */
interface ExpiryDropdownProperties {
  /** The current active locale (de, fr, en). */
  locale: Locale | undefined;
  /** The selected expiry duration in seconds. */
  expirySeconds: number;
  /** Callback function executed when selecting a different expiry duration. */
  handleExpiryChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * A dropdown selector that allows choosing custom preview link validity durations
 * (from 5 minutes up to 7 days).
 */
export const ExpiryDropdown: React.FC<ExpiryDropdownProperties> = ({
  locale,
  expirySeconds,
  handleExpiryChange,
}) => (
  <div className="grid w-full grid-cols-2 items-center gap-4">
    <label htmlFor="expiry" className="text-sm font-medium">
      {previewExpiryText[locale as Locale]}
    </label>
    <select
      id="expiry"
      className="bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      value={expirySeconds}
      onChange={handleExpiryChange}
    >
      <option value={300}>5 {previewMinutesText[locale as Locale]}</option>
      <option value={1800}>30 {previewMinutesText[locale as Locale]}</option>
      <option value={3600}>1 {previewHoursText[locale as Locale]}</option>
      <option value={10_800}>3 {previewHoursText[locale as Locale]}</option>
      <option value={86_400}>1 {previewDaysText[locale as Locale]}</option>
      <option value={604_800}>7 {previewDaysText[locale as Locale]}</option>
    </select>
  </div>
);
