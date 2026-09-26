import type { MaterialLoanStatus } from '@/lib/prisma/client';

export type MaterialItemStatus =
  | 'AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'RESERVED'
  | 'LOANED'
  | 'DAMAGED'
  | 'IN_REPAIR'
  | 'NOT_AVAILABLE';

/** Overdue and due are read off an issued loan's end date, they are not stored. */
export type MaterialLoanDisplayStatus = MaterialLoanStatus | 'RETURN_DUE' | 'OVERDUE';

export interface StockCounts {
  totalQuantity: number;
  damagedQuantity: number;
  inRepairQuantity: number;
  isDisabled: boolean;
}

export interface LoanHold {
  status: MaterialLoanStatus;
  quantity: number;
  issuedQuantity: number | null;
  isConsumption: boolean;
  startDate: Date;
  endDate: Date;
}

export interface StockSummary {
  /** pieces that could go out at all: owned minus damaged minus in repair */
  usable: number;
  /** requested or reserved, not yet handed out */
  reserved: number;
  /** handed out and not back */
  issued: number;
  /** free right now, regardless of when the reservations start */
  available: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many pieces a loan keeps from everybody else. A request already holds its pieces, so
 * two Höfe cannot both be promised the last tent while the material team sleeps.
 * Consumables leave the stock when issued, so an issued consumption holds nothing.
 */
export const getHeldQuantity = (loan: LoanHold): number => {
  switch (loan.status) {
    case 'REQUESTED':
    case 'RESERVED': {
      return loan.quantity;
    }
    case 'ISSUED': {
      return loan.isConsumption ? 0 : (loan.issuedQuantity ?? loan.quantity);
    }
    default: {
      return 0;
    }
  }
};

/** The stock of one article at this moment. */
export const getStockSummary = (item: StockCounts, loans: LoanHold[]): StockSummary => {
  const usable = Math.max(0, item.totalQuantity - item.damagedQuantity - item.inRepairQuantity);
  let reserved = 0;
  let issued = 0;
  for (const loan of loans) {
    const held = getHeldQuantity(loan);
    if (loan.status === 'ISSUED') issued += held;
    else reserved += held;
  }
  return { usable, reserved, issued, available: Math.max(0, usable - reserved - issued) };
};

/** The badge an article shows in the catalogue. */
export const getItemStatus = (item: StockCounts, stock: StockSummary): MaterialItemStatus => {
  if (item.isDisabled) return 'NOT_AVAILABLE';
  if (stock.usable === 0) {
    if (item.inRepairQuantity > 0) return 'IN_REPAIR';
    if (item.damagedQuantity > 0) return 'DAMAGED';
    return 'NOT_AVAILABLE';
  }
  if (stock.available === stock.usable) return 'AVAILABLE';
  if (stock.available > 0) return 'PARTIALLY_AVAILABLE';
  return stock.issued >= stock.reserved ? 'LOANED' : 'RESERVED';
};

/**
 * The most pieces that are held at the same time anywhere inside `[start, end]`. Summing
 * every overlapping loan would refuse a request that fits between two reservations.
 * An overdue loan holds without end: nobody knows when it comes back, so nothing it holds can
 * be promised to anyone until it is checked in.
 */
export const getPeakHeldQuantity = (
  loans: LoanHold[],
  period: { start: Date; end: Date },
  now: Date,
): number => {
  const periodStart = period.start.getTime();
  const periodEnd = period.end.getTime();
  const events: { at: number; delta: number }[] = [];

  for (const loan of loans) {
    const held = getHeldQuantity(loan);
    if (held === 0) continue;
    const loanStart = loan.startDate.getTime();
    const overdue = loan.status === 'ISSUED' && loan.endDate.getTime() < now.getTime();
    const loanEnd = overdue ? Number.POSITIVE_INFINITY : loan.endDate.getTime();
    if (loanStart > periodEnd || loanEnd < periodStart) continue;
    events.push(
      { at: Math.max(loanStart, periodStart), delta: held },
      { at: Math.min(loanEnd, periodEnd), delta: -held },
    );
  }

  // both ends are inclusive: at equal times a start counts before an end
  events.sort((a, b) => (a.at === b.at ? b.delta - a.delta : a.at - b.at));

  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }
  return peak;
};

/** Pieces that can still be promised for a period, never below zero. */
export const getAvailableForPeriod = (
  item: StockCounts,
  loans: LoanHold[],
  period: { start: Date; end: Date },
  now: Date,
): number => {
  if (item.isDisabled) return 0;
  const usable = Math.max(0, item.totalQuantity - item.damagedQuantity - item.inRepairQuantity);
  return Math.max(0, usable - getPeakHeldQuantity(loans, period, now));
};

/** The loan status as the people waiting for the material see it. */
export const getLoanDisplayStatus = (
  loan: { status: MaterialLoanStatus; endDate: Date },
  now: Date,
): MaterialLoanDisplayStatus => {
  if (loan.status !== 'ISSUED') return loan.status;
  const remaining = loan.endDate.getTime() - now.getTime();
  if (remaining < 0) return 'OVERDUE';
  if (remaining < DAY_MS) return 'RETURN_DUE';
  return 'ISSUED';
};
