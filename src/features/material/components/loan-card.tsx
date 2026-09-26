'use client';

import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { formatDay, labels } from '@/features/material/components/material-labels';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import { focusRing } from '@/features/material/components/material-ui';
import type { MaterialLoan } from '@/features/material/hooks/use-material';
import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, CalendarDays, CornerDownLeft, User } from 'lucide-react';
import type React from 'react';

/** The quantity that matters now: what went out once it went out, otherwise what was asked. */
export const loanQuantity = (loan: MaterialLoan): number => loan.issuedQuantity ?? loan.quantity;

/** Who has the loan: the person it is booked on, otherwise whoever is responsible for it. */
export const loanHolderName = (loan: MaterialLoan): string =>
  loan.person?.name ?? loan.responsibleName;

/**
 * One loan as a tappable card, the same everywhere a loan is listed. Three lines at most:
 * what and how many with the status, who has it, and when it comes back.
 */
export const LoanCard: React.FC<{
  loan: MaterialLoan;
  locale: Locale;
  onOpen: (loan: MaterialLoan) => void;
  now: Date;
  selected?: boolean;
  /** what a tap does, for screen readers when it selects rather than opens */
  pressed?: boolean;
}> = ({ loan, locale, onOpen, now, selected = false, pressed }) => {
  const status = getLoanDisplayStatus(loan, now);
  const holder = loanHolderName(loan);
  // a cache entry restored from an older app version may lack the field
  const announced = loan.returnAnnouncedAt instanceof Date && loan.status === 'ISSUED';
  return (
    <button
      type="button"
      onClick={() => onOpen(loan)}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-gray-50',
        focusRing,
        'focus-visible:ring-inset',
        status === 'OVERDUE' && 'bg-red-50/60',
        selected && 'bg-conveniat-green/10 hover:bg-conveniat-green/15',
      )}
    >
      <MaterialItemImage name={loan.item.name} imageUrl={loan.item.imageUrl} className="size-11" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-gray-900" title={loan.item.name}>
            <span className="font-bold tabular-nums">{loanQuantity(loan)} ×</span> {loan.item.name}
          </span>
          <LoanStatusBadge status={status} locale={locale} />
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-gray-600">
          <Building2 className="size-3.5 shrink-0" aria-hidden />
          <span className="shrink-0" title={loan.department.name}>
            {loan.department.shortName}
          </span>
          <span aria-hidden>·</span>
          <User className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate" title={holder}>
            {holder}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {formatDay(loan.startDate, locale)} – {formatDay(loan.endDate, locale)}
          </span>
          <span className="shrink-0 font-mono text-gray-400">#{loan.number}</span>
          {announced && (
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue-700">
              <CornerDownLeft className="size-3" aria-hidden />
              <span className="hidden min-[380px]:inline">{labels.returnAnnounced[locale]}</span>
              <span className="sr-only min-[380px]:hidden">{labels.returnAnnounced[locale]}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
