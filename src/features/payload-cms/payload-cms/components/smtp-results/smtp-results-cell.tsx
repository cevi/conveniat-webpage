'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import {
  getSmtpTooltip,
  SmtpBadge,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import { parseSmtpStats } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import { Clock } from 'lucide-react';
import React from 'react';

/**
 * The list cell of `deliveryStatus`: where a mail stands on its way out.
 *
 * A queued mail has not been near the mail server, so it gets a design of its own instead
 * of two empty SMTP and DSN badges. Everything else shows what the server answered, read
 * from the row's delivery log.
 *
 * Payload also renders a field's cell outside the list, without a row. Hence the guards.
 */
export const SmtpResultsCell: React.FC<{
  cellData: unknown;
  rowData?: { createdAt?: string; smtpResults?: unknown } & Record<string, unknown>;
}> = ({ cellData, rowData }) => {
  const { lang } = useSmtpTranslation();
  const titles = LOCALIZED_SMTP_LABELS[lang];

  if (cellData === 'queued') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-sky-800 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
        title={titles.queuedTooltip}
      >
        <Clock aria-hidden="true" className="h-3 w-3" />
        {titles.queued}
      </span>
    );
  }

  const { smtpState, smtpCount, dsnState, dsnCount } = parseSmtpStats(
    rowData?.smtpResults,
    rowData?.createdAt,
  );

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
