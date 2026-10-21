import { itemStatusLabel, loanStatusLabel } from '@/features/material/components/material-labels';
import type {
  MaterialItemStatus,
  MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The app's chip, and its tones: neutral for the everyday, red for what wants a hand (strong
 * once it is overdue), the soft green for what is ready.
 */
export const chip =
  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold whitespace-nowrap';

export const chipTone = {
  neutral: 'bg-chip text-green-900',
  ready: 'bg-tint text-conveniat-green',
  warning: 'bg-danger-soft text-danger-text',
  overdue: 'bg-danger text-white',
  done: 'bg-quiet text-green-700',
} as const;

const itemStatusClass: Record<MaterialItemStatus, string> = {
  AVAILABLE: chipTone.ready,
  PARTIALLY_AVAILABLE: chipTone.ready,
  RESERVED: chipTone.neutral,
  LOANED: chipTone.neutral,
  DAMAGED: chipTone.warning,
  IN_REPAIR: chipTone.warning,
  NOT_AVAILABLE: chipTone.done,
};

/**
 * Whether the status is the everyday one, something is free. A list leaves its badge out: the
 * free count under the name already says it, and a badge on every row would drown the few
 * that need one.
 */
export const isRoutineItemStatus = (status: MaterialItemStatus): boolean =>
  status === 'AVAILABLE' || status === 'PARTIALLY_AVAILABLE';

const loanStatusClass: Record<MaterialLoanDisplayStatus, string> = {
  REQUESTED: chipTone.neutral,
  RESERVED: chipTone.ready,
  ISSUED: chipTone.ready,
  RETURN_DUE: chipTone.warning,
  OVERDUE: chipTone.overdue,
  RETURNED: chipTone.done,
  CONSUMED: chipTone.done,
  CANCELLED: cn(chipTone.done, 'text-green-500 line-through'),
  // refused, unlike a loan that came back: the requester has to know and find another way
  REJECTED: chipTone.warning,
};

export const ItemStatusBadge: React.FC<{ status: MaterialItemStatus; locale: Locale }> = ({
  status,
  locale,
}) => <span className={cn(chip, itemStatusClass[status])}>{itemStatusLabel[status][locale]}</span>;

export const LoanStatusBadge: React.FC<{ status: MaterialLoanDisplayStatus; locale: Locale }> = ({
  status,
  locale,
}) => <span className={cn(chip, loanStatusClass[status])}>{loanStatusLabel[status][locale]}</span>;
