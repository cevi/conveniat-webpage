import { itemStatusLabel, loanStatusLabel } from '@/features/material/components/material-labels';
import type {
  MaterialItemStatus,
  MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const itemStatusClass: Record<MaterialItemStatus, string> = {
  AVAILABLE: 'bg-green-50 text-green-800 ring-green-600/30',
  PARTIALLY_AVAILABLE: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  RESERVED: 'bg-blue-50 text-blue-800 ring-blue-600/30',
  LOANED: 'bg-orange-50 text-orange-800 ring-orange-600/30',
  DAMAGED: 'bg-red-50 text-red-800 ring-red-600/30',
  IN_REPAIR: 'bg-purple-50 text-purple-800 ring-purple-600/30',
  NOT_AVAILABLE: 'bg-gray-100 text-gray-600 ring-gray-500/30',
};

const itemStatusDot: Record<MaterialItemStatus, string> = {
  AVAILABLE: 'bg-green-600',
  PARTIALLY_AVAILABLE: 'bg-amber-500',
  RESERVED: 'bg-blue-600',
  LOANED: 'bg-orange-600',
  DAMAGED: 'bg-red-600',
  IN_REPAIR: 'bg-purple-600',
  NOT_AVAILABLE: 'bg-gray-400',
};

const loanStatusClass: Record<MaterialLoanDisplayStatus, string> = {
  RESERVED: 'bg-blue-50 text-blue-800 ring-blue-600/30',
  ISSUED: 'bg-green-50 text-green-800 ring-green-600/30',
  RETURN_DUE: 'bg-orange-50 text-orange-800 ring-orange-600/30',
  OVERDUE: 'bg-red-600 text-white ring-red-700',
  RETURNED: 'bg-gray-100 text-gray-700 ring-gray-500/30',
  CONSUMED: 'bg-gray-100 text-gray-700 ring-gray-500/30',
  CANCELLED: 'bg-gray-50 text-gray-400 ring-gray-300 line-through',
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
