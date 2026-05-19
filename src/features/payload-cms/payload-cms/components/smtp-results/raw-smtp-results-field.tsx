'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import { useField } from '@payloadcms/ui';
import React from 'react';

export const RawSmtpResultsField: React.FC<{
  path: string;
  label?: Record<string, string> | string;
}> = ({ path, label }) => {
  const { value } = useField<Record<string, unknown> | null | undefined>({ path });

  const { lang } = useSmtpTranslation();

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
