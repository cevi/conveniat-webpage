'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import { deriveDeliveryOverview } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import { DeliveryOverviewList } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview-list';
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
  const { lang } = useSmtpTranslation();
  const labels = LOCALIZED_SMTP_LABELS[lang];

  // When the mail last left. A queued mail is created well before that.
  const sentAtField = useFormFields(([fields]) => fields['smtpReceivedAt']);
  const sentAtString = typeof sentAtField?.value === 'string' ? sentAtField.value : undefined;

  if (!Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type textarea">
        <label className="field-label">{labels.sectionTitle}</label>
        <div className="text-gray-500">{labels.noResults}</div>
      </div>
    );
  }

  const overview = deriveDeliveryOverview(value, {
    systemEmails,
    toAddress,
    createdAt: createdAtString,
    sentAt: sentAtString,
  });

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labels.sectionTitle}</label>
      <DeliveryOverviewList overview={overview} lang={lang} smtpDomain={smtpDomain} />
    </div>
  );
};

export default SmtpResultsField;
