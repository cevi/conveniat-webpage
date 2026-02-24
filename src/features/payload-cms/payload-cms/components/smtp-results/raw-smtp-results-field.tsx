'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import { useField, useTranslation } from '@payloadcms/ui';
import React from 'react';

export const RawSmtpResultsField: React.FC<{
  path: string;
  label?: Record<string, string> | string;
}> = ({ path, label }) => {
  const { value } = useField<Record<string, unknown> | null | undefined>({ path });

  const { i18n } = useTranslation();
  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  const labels = LOCALIZED_SMTP_LABELS[lang];

  let labelText: string = labels.rawSmtpResults;
  if (typeof label === 'string') {
    labelText = label;
  } else if (label !== undefined && typeof label === 'object') {
    const typedLabel = label;
    if (typeof typedLabel[lang] === 'string') {
      labelText = typedLabel[lang];
    }
  }

  // Attempt to translate or provide a fallback if needed
  if (!value) {
    return (
      <div className="field-type custom-field mb-4">
        <label className="field-label">{labelText}</label>
        <div className="text-gray-500">{labels.noData}</div>
      </div>
    );
  }

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labelText}</label>
      <pre className="border-border bg-background mt-2 w-full overflow-x-auto rounded border border-gray-200 bg-gray-50 p-4 font-mono text-xs whitespace-pre-wrap dark:border-gray-800 dark:bg-gray-900">
        {JSON.stringify(value, undefined, 2)}
      </pre>
    </div>
  );
};

export default RawSmtpResultsField;
