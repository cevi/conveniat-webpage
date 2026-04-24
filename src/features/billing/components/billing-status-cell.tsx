'use client';

import React from 'react';

type BillingStatus =
  | 'new'
  | 'bill_created'
  | 'bill_sent'
  | 'removed'
  | 're_added'
  | 'updated'
  | 'reminder_sent';

const statusConfig: Record<BillingStatus, { label: string; colorClasses: string }> = {
  new: {
    label: 'Neu',
    colorClasses:
      'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
  bill_created: {
    label: 'Rechnung erstellt',
    colorClasses:
      'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  },
  bill_sent: {
    label: 'Rechnung gesendet',
    colorClasses:
      'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200',
  },
  removed: {
    label: 'Entfernt',
    colorClasses:
      'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200',
  },
  re_added: {
    label: 'Erneut hinzugefügt',
    colorClasses:
      'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  updated: {
    label: 'Aktualisiert',
    colorClasses:
      'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  reminder_sent: {
    label: 'Mahnung gesendet',
    colorClasses:
      'border-cyan-200 bg-cyan-100 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  },
};

const baseClasses =
  'inline-flex items-center justify-center whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium';

/**
 * Custom Payload CMS Cell component for the `status` field in bill-participants.
 * Renders a colored outline badge matching the SmtpBadge design.
 */
export const BillingStatusCell: React.FC<{
  cellData: unknown;
}> = ({ cellData }) => {
  const status = cellData as BillingStatus | undefined;

  if (!status || !(status in statusConfig)) {
    return (
      <span
        className={`${baseClasses} border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500`}
      >
        –
      </span>
    );
  }

  const config = statusConfig[status];

  return <span className={`${baseClasses} ${config.colorClasses}`}>{config.label}</span>;
};

export default BillingStatusCell;
