'use client';

import { useField, useTranslation } from '@payloadcms/ui';
import React from 'react';

const LABELS: Record<string, { en: string; de: string; fr: string }> = {
  missingStammdaten: {
    en: 'Missing Master Data',
    de: 'Fehlende Stammdaten',
    fr: 'Stammdaten manquantes',
  },
  missingAnmeldeangaben: {
    en: 'Missing Event Registration Answers',
    de: 'Fehlende Anmeldeangaben',
    fr: 'Anmeldeangaben manquantes',
  },
};

const NO_MISSING_MESSAGES = {
  en: 'No missing details (Complete)',
  de: 'Keine fehlenden Angaben (Vollständig)',
  fr: 'Aucune donnée manquante (Complet)',
};

export const MissingDataField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<string[]>({ path });
  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  // Determine which field this is based on the path
  const fieldName = path.includes('.') ? (path.split('.').pop() ?? '') : path;
  const fieldLabels = LABELS[fieldName] ?? { en: fieldName, de: fieldName, fr: fieldName };
  const labelText = fieldLabels[lang];

  const hasMissing = Array.isArray(value) && value.length > 0;

  return (
    <div className="field-type">
      <label className="field-label mb-2 block font-semibold text-gray-900 dark:text-gray-100">
        {labelText}
      </label>
      {hasMissing ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 ring-1 ring-red-600/20 ring-inset dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/20"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {NO_MISSING_MESSAGES[lang]}
        </div>
      )}
    </div>
  );
};

export default MissingDataField;
