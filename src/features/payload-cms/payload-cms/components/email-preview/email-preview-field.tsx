'use client';

import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import type { StaticTranslationString } from '@/types/types';
import { useField, useFormFields } from '@payloadcms/ui';
import type React from 'react';

const noContent: StaticTranslationString = {
  en: 'This mail has no content.',
  de: 'Diese Mail hat keinen Inhalt.',
  fr: "Cet e-mail n'a pas de contenu.",
};
const previewTitle: StaticTranslationString = {
  en: 'Mail preview',
  de: 'Vorschau der Mail',
  fr: "Aperçu de l'e-mail",
};

/**
 * The mail as its recipient sees it. Sits alone in its tab, which names it, so it has no label.
 */
export const EmailPreviewField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<string | null | undefined>({ path });
  // Plain-text mails have no HTML part; their body lives in the sibling `text` field.
  const textValue = useFormFields(([fields]) => fields['text']?.value);
  const { lang } = useSmtpTranslation();

  const hasHtml = typeof value === 'string' && value !== '';

  if (!hasHtml && typeof textValue === 'string' && textValue !== '') {
    return (
      <pre className="field-type mb-4 rounded border border-(--theme-elevation-150) p-4 font-sans whitespace-pre-wrap">
        {textValue}
      </pre>
    );
  }

  if (!hasHtml) {
    return <p className="field-type mb-4 text-(--theme-elevation-500)">{noContent[lang]}</p>;
  }

  // An iframe with sandbox="" cannot be measured from here (it is cross-origin), so it gets a
  // tall fixed height and scrolls inside.
  return (
    <div className="field-type mb-4 overflow-hidden rounded border border-(--theme-elevation-150) bg-white">
      {/* The empty sandbox isolates the mail completely, stripping it of the parent's origin. */}
      <iframe
        srcDoc={value}
        className="h-full min-h-[600px] w-full border-none"
        sandbox=""
        title={previewTitle[lang]}
      />
    </div>
  );
};

export default EmailPreviewField;
