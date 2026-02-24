'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import { SmtpResultItem } from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-result-item';
import { deriveSmtpItems } from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-logic';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import { extractEmailAddress } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import { useField, useFormFields } from '@payloadcms/ui';
import React from 'react';

export const SmtpResultsField: React.FC<{
  path: string;
  smtpDomain?: string;
  systemEmails?: string[];
}> = ({ path, smtpDomain = 'cevi.tools', systemEmails = [] }) => {
  const { value } = useField<SmtpResult[]>({ path });

  const toField = useFormFields(([fields]) => fields['to']);
  const toAddress =
    typeof toField?.value === 'string' ? extractEmailAddress(toField.value) : undefined;

  const createdAtField = useFormFields(([fields]) => fields['createdAt']);
  const createdAtString =
    typeof createdAtField?.value === 'string' ? createdAtField.value : undefined;
  const createdAtDate = createdAtString === undefined ? undefined : new Date(createdAtString);

  const dsnReceivedAtField = useFormFields(([fields]) => fields['dsnReceivedAt']);
  const dsnReceivedAtString =
    typeof dsnReceivedAtField?.value === 'string' ? dsnReceivedAtField.value : undefined;
  const dsnReceivedAtDate =
    dsnReceivedAtString === undefined ? undefined : new Date(dsnReceivedAtString);

  const { lang } = useSmtpTranslation();
  const labels = LOCALIZED_SMTP_LABELS[lang];

  const [currentTimeMs, setCurrentTimeMs] = React.useState(0);
  React.useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  if (!Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type textarea">
        <label className="field-label">{labels.sectionTitle}</label>
        <div className="text-gray-500">{labels.noResults}</div>
      </div>
    );
  }

  const finalItems = deriveSmtpItems(value, toAddress, systemEmails);

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labels.sectionTitle}</label>
      <div className="flex flex-col gap-2">
        {finalItems.map((result, index) => (
          <SmtpResultItem
            key={index}
            result={result}
            lang={lang}
            smtpDomain={smtpDomain}
            systemEmails={systemEmails}
            toAddress={toAddress}
            createdAtDate={createdAtDate}
            dsnReceivedAtDate={dsnReceivedAtDate}
            currentTimeMs={currentTimeMs}
          />
        ))}
      </div>
    </div>
  );
};

export default SmtpResultsField;
