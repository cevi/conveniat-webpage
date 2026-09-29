import { itemStatusLabel, loanStatusLabel } from '@/features/material/components/material-labels';
import type {
  MaterialItemStatus,
  MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

// only colours from the app's palette exist: no purple, and orange has nothing but 500
const itemStatusClass: Record<MaterialItemStatus, string> = {
  AVAILABLE: 'bg-green-50 text-green-800 ring-green-600/20',
  PARTIALLY_AVAILABLE: 'bg-green-50 text-green-800 ring-green-600/20',
  RESERVED: 'bg-blue-50 text-blue-800 ring-blue-600/20',
  LOANED: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  DAMAGED: 'bg-red-50 text-red-800 ring-red-600/20',
  IN_REPAIR: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  NOT_AVAILABLE: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const itemStatusDot: Record<MaterialItemStatus, string> = {
  AVAILABLE: 'bg-conveniat-green',
  PARTIALLY_AVAILABLE: 'bg-conveniat-green',
  RESERVED: 'bg-blue-400',
  LOANED: 'bg-amber-500',
  DAMAGED: 'bg-red-500',
  IN_REPAIR: 'bg-slate-500',
  NOT_AVAILABLE: 'bg-gray-400',
};

/**
 * Whether the status is the everyday one, something is free. A list leaves its badge out: the
 * free count under the name already says it, and a badge on every row would drown the few
 * that need one.
 */
export const isRoutineItemStatus = (status: MaterialItemStatus): boolean =>
  status === 'AVAILABLE' || status === 'PARTIALLY_AVAILABLE';

const loanStatusClass: Record<MaterialLoanDisplayStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  RESERVED: 'bg-blue-50 text-blue-800 ring-blue-600/30',
  ISSUED: 'bg-green-50 text-green-800 ring-green-600/30',
  RETURN_DUE: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  OVERDUE: 'bg-red-600 text-white ring-red-700',
  RETURNED: 'bg-gray-100 text-gray-700 ring-gray-500/30',
  CONSUMED: 'bg-gray-100 text-gray-700 ring-gray-500/30',
  CANCELLED: 'bg-gray-50 text-gray-400 ring-gray-300 line-through',
  REJECTED: 'bg-red-50 text-red-800 ring-red-600/30',
};

const pill =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset';

export const ItemStatusBadge: React.FC<{ status: MaterialItemStatus; locale: Locale }> = ({
  status,
  locale,
}) => (
  <span className={cn(pill, itemStatusClass[status])}>
    <span className={cn('size-1.5 rounded-full', itemStatusDot[status])} aria-hidden />
    {itemStatusLabel[status][locale]}
  </span>
);

export const LoanStatusBadge: React.FC<{ status: MaterialLoanDisplayStatus; locale: Locale }> = ({
  status,
  locale,
}) => <span className={cn(pill, loanStatusClass[status])}>{loanStatusLabel[status][locale]}</span>;
