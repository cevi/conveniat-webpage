'use client';

import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type BillingStatus =
  | 'new'
  | 'pflichtangaben_missing'
  | 'invalid_anmeldeangaben'
  | 'bill_created'
  | 'bill_sent'
  | 'removed'
  | 're_added'
  | 'updated'
  | 'reminder_sent';

const statusConfig: Record<BillingStatus, { label: string; colorClasses: string }> = {
  new: {
    label: 'Vollständig erfasst',
    colorClasses:
      'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
  pflichtangaben_missing: {
    label: 'Pflichtangaben fehlen',
    colorClasses:
      'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  },
  invalid_anmeldeangaben: {
    label: 'Anmeldeangaben ungültig',
    colorClasses:
      'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200',
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

interface RowData {
  id: string;
  missingStammdaten?: unknown;
  missingAnmeldeangaben?: unknown;
}

/**
 * Custom Payload CMS Cell component for the `status` field in bill-participants.
 * Renders a colored outline badge matching the SmtpBadge design.
 */
export const BillingStatusCell: React.FC<{
  cellData: unknown;
  rowData: RowData;
}> = ({ cellData, rowData }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const status = cellData as BillingStatus | undefined;

  if (status === undefined || !(status in statusConfig)) {
    return (
      <span
        className={`${baseClasses} border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500`}
      >
        –
      </span>
    );
  }

  const config = statusConfig[status];

  const stammdatenArray = Array.isArray(rowData.missingStammdaten)
    ? (rowData.missingStammdaten as string[])
    : [];
  const anmeldeangabenArray = Array.isArray(rowData.missingAnmeldeangaben)
    ? (rowData.missingAnmeldeangaben as string[])
    : [];

  const hasMissingData =
    status === 'pflichtangaben_missing' &&
    (stammdatenArray.length > 0 || anmeldeangabenArray.length > 0);

  const badge = (
    <span className={`${baseClasses} ${config.colorClasses} cursor-help`}>{config.label}</span>
  );

  if (hasMissingData && mounted) {
    return (
      <div className="my-1 flex flex-col gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-[250px] p-2.5 text-xs whitespace-normal"
            >
              <div className="flex flex-col gap-1.5">
                {stammdatenArray.length > 0 && (
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Stammdaten fehlen:{' '}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {stammdatenArray.join(', ')}
                    </span>
                  </div>
                )}
                {anmeldeangabenArray.length > 0 && (
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Anmeldeangaben fehlen:{' '}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {anmeldeangabenArray.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="my-1 flex flex-col gap-1">
      <div>{badge}</div>
    </div>
  );
};

export default BillingStatusCell;
