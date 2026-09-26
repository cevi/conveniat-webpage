'use client';

import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import { MaterialButton } from '@/features/material/components/material-ui';
import type { MaterialLoan } from '@/features/material/hooks/use-material';
import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, CornerDownLeft, PackageCheck, PackageOpen, User } from 'lucide-react';
import type React from 'react';

const text = {
  returnAnnounced: {
    de: 'Rückgabe gemeldet',
    en: 'Return announced',
    fr: 'Retour annoncé',
  },
} satisfies Record<string, StaticTranslationString>;

/** The quantity that matters now: what went out once it went out, otherwise what was asked. */
export const loanQuantity = (loan: MaterialLoan): number => loan.issuedQuantity ?? loan.quantity;

/** One loan as a tappable row, the same everywhere a loan is listed. */
export const LoanCard: React.FC<{
  loan: MaterialLoan;
  locale: Locale;
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
}> = ({ loan, locale, onOpen, now }) => {
  const status = getLoanDisplayStatus(loan, now);
  return (
    <button
      type="button"
      onClick={() => onOpen(loan)}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-gray-50',
        status === 'OVERDUE' && 'bg-red-50/60',
      )}
    >
      <MaterialItemImage name={loan.item.name} imageUrl={loan.item.imageUrl} className="size-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-gray-900 tabular-nums">{loanQuantity(loan)} ×</span>
          <span className="truncate font-semibold text-gray-900">{loan.item.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3" aria-hidden />
            {loan.department.shortName}
          </span>
          {loan.person?.name !== undefined && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" aria-hidden />
              {loan.person.name}
            </span>
          )}
          <span>
            {formatDay(loan.startDate, locale)} – {formatDay(loan.endDate, locale)}
          </span>
          <span className="font-mono text-gray-400">
            {format(labels.loanNumber, locale, { n: loan.number })}
          </span>
        </div>
        {/* a cache entry restored from an older app version may lack the field */}
        {loan.returnAnnouncedAt instanceof Date && loan.status === 'ISSUED' && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
            <CornerDownLeft className="size-3" aria-hidden />
            {text.returnAnnounced[locale]}
          </div>
        )}
      </div>
      <LoanStatusBadge status={status} locale={locale} />
    </button>
  );
};

/** The step a quick action opens the loan dialog in. */
export type LoanQuickMode = 'issue' | 'return';

/**
 * The next counter step for a loan, one tap from a list: check in what is out, hand out what
 * is booked. Only the material team runs the counter, so for everybody else there is none.
 */
export const LoanQuickAction: React.FC<{
  loan: MaterialLoan;
  locale: Locale;
  isMaterialTeam: boolean;
  onOpen: (loan: MaterialLoan, mode: LoanQuickMode) => void;
}> = ({ loan, locale, isMaterialTeam, onOpen }) => {
  if (!isMaterialTeam) return <></>;
  if (loan.status === 'ISSUED') {
    return (
      <MaterialButton
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(loan, 'return');
        }}
      >
        <PackageCheck aria-hidden />
        {labels.recordReturn[locale]}
      </MaterialButton>
    );
  }
  if (loan.status === 'REQUESTED' || loan.status === 'RESERVED') {
    return (
      <MaterialButton
        size="sm"
        variant="secondary"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(loan, 'issue');
        }}
      >
        <PackageOpen aria-hidden />
        {labels.handOut[locale]}
      </MaterialButton>
    );
  }
  return <></>;
};
