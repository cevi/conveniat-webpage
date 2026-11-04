'use client';

import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { StatusBadgeTone } from '@/features/billing-core/components/status-badge';
import { StatusBadge } from '@/features/billing-core/components/status-badge';
import type { BillingStatus } from '@/features/billing/services/billing-status';
import {
  BILLING_STATUS_LABELS_DE,
  formatBillingStatus,
} from '@/features/billing/services/billing-status';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';

/**
 * Colour only. The German wording lives in `billing-status`, so a status is named the same
 * way here, in the finance export and in the messages a billing run reports.
 */
const statusTones: Record<BillingStatus, StatusBadgeTone> = {
  new: 'blue',
  pflichtangaben_missing: 'yellow',
  invalid_anmeldeangaben: 'red',
  needs_manual_review: 'fuchsia',
  bill_created: 'orange',
  bill_mail_pending: 'sky',
  bill_sent: 'green',
  removed: 'red',
  re_added: 'violet',
  updated: 'amber',
  reminder_sent: 'cyan',
  paid: 'emerald',
};

interface RowData {
  id: string;
  missingStammdaten?: unknown;
  missingAnmeldeangaben?: unknown;
  doublePayment?: unknown;
}

const doublePaymentLabel: StaticTranslationString = {
  de: 'Doppelzahlung',
  en: 'Double payment',
  fr: 'Double paiement',
};

/** Shown under the status, which stays «Bezahlt»: the bill is paid, just more than once. */
const DoublePaymentBadge: React.FC = () => {
  const { code } = useLocale();
  return <StatusBadge tone="red">{doublePaymentLabel[resolveAdminLocale(code)]}</StatusBadge>;
};

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

  if (status === undefined || !(status in BILLING_STATUS_LABELS_DE)) {
    return <StatusBadge tone="none">–</StatusBadge>;
  }

  const label = formatBillingStatus(status);

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
    <StatusBadge tone={statusTones[status]} className="cursor-help">
      {label}
    </StatusBadge>
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
      {rowData.doublePayment === true && (
        <div>
          <DoublePaymentBadge />
        </div>
      )}
    </div>
  );
};

export default BillingStatusCell;
