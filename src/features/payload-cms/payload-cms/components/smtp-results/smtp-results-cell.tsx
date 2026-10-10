'use client';

import { LOCALIZED_SMTP_LABELS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import { deriveDeliveryOverview } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import { StateSummary } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview-table';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { useCurrentTime } from '@/features/payload-cms/payload-cms/components/smtp-results/use-current-time';
import { useSmtpTranslation } from '@/features/payload-cms/payload-cms/components/smtp-results/use-smtp-translation';
import { Clock } from 'lucide-react';
import React from 'react';

/**
 * The list cell of `deliveryStatus`: where a mail stands on its way out.
 *
 * A queued mail has not been near the mail server, so it gets a design of its own. Everything
 * else shows how many recipients are in which state, counted the same way as the table on the
 * mail itself.
 *
 * Payload also renders a field's cell outside the list, without a row. Hence the guards.
 */
export const SmtpResultsCell: React.FC<{
  cellData: unknown;
  rowData?: { createdAt?: string; smtpResults?: unknown; to?: unknown } & Record<string, unknown>;
  systemEmails?: string[];
}> = ({ cellData, rowData, systemEmails = [] }) => {
  const { lang } = useSmtpTranslation();
  const labels = LOCALIZED_SMTP_LABELS[lang];
  const currentTimeMs = useCurrentTime();

  if (cellData === 'queued') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-sky-800 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
        title={labels.queuedTooltip}
      >
        <Clock aria-hidden="true" className="h-3 w-3" />
        {labels.queued}
      </span>
    );
  }

  const results = rowData?.smtpResults;
  if (!Array.isArray(results) || results.length === 0) {
    return <span className="text-(--theme-elevation-400)">–</span>;
  }

  const { current } = deriveDeliveryOverview(results as SmtpResult[], {
    systemEmails,
    toAddress: typeof rowData?.to === 'string' ? rowData.to : undefined,
    createdAt: rowData?.createdAt,
    now: currentTimeMs,
  });

  return (
    <div className="flex flex-wrap items-center gap-1">
      <StateSummary attempt={current} labels={labels} />
    </div>
  );
};

export default SmtpResultsCell;
