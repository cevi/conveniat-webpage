import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import type { MaterialCondition, MaterialLoanStatus } from '@/lib/prisma/client';

interface ReturnQueueLoan {
  status: MaterialLoanStatus;
  endDate: Date;
  returnAnnouncedAt?: Date | null;
}

/** Announced first, then overdue, then due; the order the depot works through them. */
const returnRank = (loan: ReturnQueueLoan, now: Date): number | undefined => {
  if (loan.status !== 'ISSUED') return undefined;
  // a blob restored from yesterday's cache may lack the field
  if (loan.returnAnnouncedAt instanceof Date) return 0;
  const status = getLoanDisplayStatus(loan, now);
  if (status === 'OVERDUE') return 1;
  if (status === 'RETURN_DUE') return 2;
  return undefined;
};

/** Material that should come back now: announced, due within a day, or overdue. */
export const isInReturnQueue = (loan: ReturnQueueLoan, now: Date): boolean =>
  returnRank(loan, now) !== undefined;

/** Sorts the return queue, and within one group the loan that is due first comes first. */
export const compareReturnQueue =
  (now: Date) =>
  (a: ReturnQueueLoan, b: ReturnQueueLoan): number => {
    const rank = (returnRank(a, now) ?? 3) - (returnRank(b, now) ?? 3);
    return rank === 0 ? a.endDate.getTime() - b.endDate.getTime() : rank;
  };

/**
 * Whether a check-in makes sense before it is sent: "missing" needs pieces that did not come
 * back, and a damage needs pieces that did, with at least one of them damaged.
 */
export const isReturnValid = ({
  issued,
  returned,
  condition,
  damaged,
}: {
  issued: number;
  returned: number;
  condition: MaterialCondition;
  damaged: number;
}): boolean => {
  if (returned < 0 || returned > issued) return false;
  switch (condition) {
    case 'MISSING': {
      return returned < issued;
    }
    case 'LIGHT_DAMAGE': {
      return returned > 0;
    }
    case 'DAMAGED': {
      return returned > 0 && damaged >= 1 && damaged <= returned;
    }
    default: {
      return true;
    }
  }
};
