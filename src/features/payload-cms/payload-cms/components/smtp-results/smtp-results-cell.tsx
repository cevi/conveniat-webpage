'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import {
  getSmtpTooltip,
  SmtpBadge,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import { parseSmtpStats } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import React from 'react';

export const SmtpResultsCell: React.FC<{
  cellData: unknown;
  rowData?: { createdAt?: string } & Record<string, unknown>;
}> = ({ cellData, rowData }) => {
  const { lang } = useSmtpTranslation();
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
