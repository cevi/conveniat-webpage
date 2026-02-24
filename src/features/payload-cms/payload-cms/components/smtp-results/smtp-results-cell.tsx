'use client';

import {
  getSmtpTooltip,
  LOCALIZED_SMTP_LABELS,
  parseSmtpStats,
  SmtpBadge,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import { useTranslation } from '@payloadcms/ui';
import React from 'react';

export const SmtpResultsCell: React.FC<{
  cellData: unknown;
  rowData?: { createdAt?: string } & Record<string, unknown>;
}> = ({ cellData, rowData }) => {
  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  const titles = LOCALIZED_SMTP_LABELS[lang];

  const { smtpState, smtpCount, dsnState, dsnCount } = parseSmtpStats(cellData, rowData?.createdAt);

  return (
    <div className="flex items-center gap-1">
      <SmtpBadge
        prefix="SMTP"
        type={smtpState}
        count={smtpCount}
        tooltip={getSmtpTooltip(smtpState, titles, false)}
      />
      <SmtpBadge
        prefix="DSN"
        type={dsnState}
        count={dsnCount}
        tooltip={getSmtpTooltip(dsnState, titles, true)}
      />
    </div>
  );
};

export default SmtpResultsCell;
