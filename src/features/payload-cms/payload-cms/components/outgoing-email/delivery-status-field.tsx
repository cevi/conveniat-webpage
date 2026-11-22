'use client';

import { SmtpResultsCell } from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-cell';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import type { StaticTranslationString } from '@/types/types';
import { FieldLabel, Pill, useField, useFormFields } from '@payloadcms/ui';
import type React from 'react';

const label: StaticTranslationString = { en: 'Delivery', de: 'Zustellung', fr: 'Livraison' };
const sending: StaticTranslationString = {
  en: 'Being sent',
  de: 'Wird gesendet',
  fr: "En cours d'envoi",
};

/**
 * The state of a mail at the top of its sidebar, drawn the way the list draws it, in place of
 * a select nobody can change.
 */
export const DeliveryStatusField: React.FC<{ path: string; systemEmails?: string[] }> = ({
  path,
  systemEmails = [],
}) => {
  const { value } = useField<string>({ path });
  const { lang } = useSmtpTranslation();
  const smtpResults = useFormFields(([fields]) => fields['smtpResults']?.value);
  const to = useFormFields(([fields]) => fields['to']?.value);
  const createdAt = useFormFields(([fields]) => fields['createdAt']?.value);
  const rowData = {
    smtpResults,
    to,
    ...(typeof createdAt === 'string' && { createdAt }),
  };

  return (
    <div className="field-type mb-6">
      <FieldLabel label={label[lang]} />
      <div className="mt-1">
        {value === 'pending' ? (
          <Pill pillStyle="light-gray" size="small">
            {sending[lang]}
          </Pill>
        ) : (
          <SmtpResultsCell cellData={value} rowData={rowData} systemEmails={systemEmails} />
        )}
      </div>
    </div>
  );
};

export default DeliveryStatusField;
