'use client';

import type { StatusBadgeTone } from '@/features/billing-core/components/status-badge';
import { StatusBadge } from '@/features/billing-core/components/status-badge';
import { formatChf } from '@/features/billing-core/money';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type {
  VisitDayBillStatus,
  VisitDayMailStatus,
} from '@/features/visit-day/billing/visit-day-bill-status';
import {
  VISIT_DAY_BILL_STATUS_LABELS,
  VISIT_DAY_MAIL_STATUS_LABELS,
} from '@/features/visit-day/billing/visit-day-bill-status';
import type { StaticTranslationString } from '@/types/types';
import { useTranslation } from '@payloadcms/ui';
import type React from 'react';

/** The colours of the camp bills where a state is the same: paid emerald, cancelled red. */
const statusTones: Record<VisitDayBillStatus, StatusBadgeTone> = {
  open: 'orange',
  paid: 'emerald',
  cancelled: 'red',
};

/** Queued and sent as the camp's waiting and sent mails, sky and green; failed red. */
const mailTones: Record<VisitDayMailStatus, StatusBadgeTone> = {
  pending: 'blue',
  queued: 'sky',
  sent: 'green',
  failed: 'red',
};

const t = {
  refundDue: {
    de: 'Rückerstattung {{amount}} offen',
    en: 'Refund {{amount}} due',
    fr: 'Remboursement {{amount}} dû',
  },
} satisfies Record<string, StaticTranslationString>;

interface StatusCellProperties {
  cellData: unknown;
  rowData: { refundDue?: unknown };
}

const isOneOf = <T extends string>(value: unknown, labels: Record<T, unknown>): value is T =>
  typeof value === 'string' && value in labels;

/**
 * The `status` column of the Besuchstag bills, with any money to give back. That covers a
 * double payment, a reduction and a cancellation alike, so it is not called «Doppelzahlung».
 */
export const VisitDayBillStatusCell: React.FC<StatusCellProperties> = ({ cellData, rowData }) => {
  const locale = resolveAdminLocale(useTranslation().i18n.language);
  if (!isOneOf(cellData, VISIT_DAY_BILL_STATUS_LABELS))
    return <StatusBadge tone="none">–</StatusBadge>;
  const refund = typeof rowData.refundDue === 'number' ? rowData.refundDue : 0;
  return (
    <div className="my-1 flex flex-col items-start gap-1">
      <StatusBadge tone={statusTones[cellData]}>
        {VISIT_DAY_BILL_STATUS_LABELS[cellData][locale]}
      </StatusBadge>
      {refund > 0 && (
        <StatusBadge tone="amber">
          {t.refundDue[locale].replace('{{amount}}', formatChf(refund))}
        </StatusBadge>
      )}
    </div>
  );
};

/** The `mailStatus` column of the Besuchstag bills. */
export const VisitDayMailStatusCell: React.FC<StatusCellProperties> = ({ cellData }) => {
  const locale = resolveAdminLocale(useTranslation().i18n.language);
  if (!isOneOf(cellData, VISIT_DAY_MAIL_STATUS_LABELS))
    return <StatusBadge tone="none">–</StatusBadge>;
  return (
    <StatusBadge tone={mailTones[cellData]}>
      {VISIT_DAY_MAIL_STATUS_LABELS[cellData][locale]}
    </StatusBadge>
  );
};
