'use client';

import { extractEmailAddress } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import type { StaticTranslationString } from '@/types/types';
import { useField, useTranslation } from '@payloadcms/ui';
import React from 'react';

const WARNING_MESSAGES: StaticTranslationString = {
  en: "Warning: Sender address '{email}' does not match the configured domain @{smtpDomain}. This might lead to delivery issues.",
  de: "Warnung: Die Absenderadresse '{email}' entspricht nicht der konfigurierten Domain @{smtpDomain}. Dies kann zu Zustellproblemen führen.",
  fr: "Attention : L'adresse de l'expéditeur '{email}' ne correspond pas au domaine configuré @{smtpDomain}. Cela peut entraîner des problèmes de livraison.",
};

const FORMAT_ERROR_MESSAGES: StaticTranslationString = {
  en: "Warning: Malformed email format. If using brackets, ensure they are balanced, e.g., 'Name' <email@domain.com>",
  de: "Warnung: Ungültiges E-Mail-Format. Wenn Sie spitze Klammern verwenden, stellen Sie sicher, dass diese korrekt geschlossen sind, z. B. 'Name' <email@domain.com>",
  fr: "Attention : Format d'e-mail malformé. Si vous utilisez des chevrons, assurez-vous qu'ils sont corrects, par exemple 'Nom' <email@domain.com>",
};

export const EmailFromWarning: React.FC<{ path: string; smtpDomain?: string }> = ({
  path,
  smtpDomain = 'cevi.tools',
}) => {
  const { value } = useField<string>({ path });
  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  if (typeof value !== 'string' || value.length === 0) {
    return <></>;
  }

  const email = extractEmailAddress(value);

  if (email === '') {
    const warningText = FORMAT_ERROR_MESSAGES[lang];
    return (
      <div className="mt-2 text-xs font-medium text-orange-600 dark:text-orange-400">
        <div className="flex items-center gap-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {warningText}
        </div>
      </div>
    );
  }

  const isMatching = email.endsWith(`@${smtpDomain}`);

  if (isMatching) {
    return <></>;
  }

  const warningText = WARNING_MESSAGES[lang]
    .replace('{email}', email)
    .replace('{smtpDomain}', smtpDomain);

  return (
    <div className="mt-2 text-xs font-medium text-orange-600 dark:text-orange-400">
      <div className="flex items-center gap-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        {warningText}
      </div>
    </div>
  );
};

export default EmailFromWarning;
