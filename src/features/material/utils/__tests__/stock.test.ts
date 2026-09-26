import {
  getAvailableForPeriod,
  getItemStatus,
  getLoanDisplayStatus,
  getStockSummary,
  type LoanHold,
  type StockCounts,
} from '@/features/material/utils/stock';

const day = (n: number): Date => new Date(Date.UTC(2027, 6, n, 12));

const tents: StockCounts = {
  totalQuantity: 10,
  damagedQuantity: 1,
  inRepairQuantity: 1,
  isDisabled: false,
};

const hold = (overrides: Partial<LoanHold>): LoanHold => ({
  status: 'RESERVED',
  quantity: 1,
  // eslint-disable-next-line unicorn/no-null -- the column is nullable
  issuedQuantity: null,
  isConsumption: false,
  startDate: day(10),
  endDate: day(12),
  ...overrides,
});

describe('getStockSummary', () => {
  it('keeps damaged and repaired pieces out of what can be lent', () => {
    const stock = getStockSummary(tents, [
      hold({ status: 'REQUESTED', quantity: 2 }),
      hold({ status: 'ISSUED', quantity: 3, issuedQuantity: 2 }),
      hold({ status: 'RETURNED', quantity: 5 }),
    ]);
    expect(stock).toEqual({ usable: 8, reserved: 2, issued: 2, available: 4 });
  });

  it('does not count used-up consumables as away', () => {
    const stock = getStockSummary(tents, [
      hold({ status: 'ISSUED', quantity: 4, isConsumption: true }),
    ]);
    expect(stock.available).toBe(8);
  });
});

describe('getItemStatus', () => {
  it('reads partially available while some pieces are free', () => {
    const stock = getStockSummary(tents, [hold({ quantity: 3 })]);
    expect(getItemStatus(tents, stock)).toBe('PARTIALLY_AVAILABLE');
  });

  it('tells reserved from loaned when nothing is free', () => {
    const reserved = getStockSummary(tents, [hold({ quantity: 8 })]);
    expect(getItemStatus(tents, reserved)).toBe('RESERVED');
    const loaned = getStockSummary(tents, [hold({ status: 'ISSUED', quantity: 8 })]);
    expect(getItemStatus(tents, loaned)).toBe('LOANED');
  });

  it('shows repair when every usable piece is in the workshop', () => {
    const item = { ...tents, damagedQuantity: 0, inRepairQuantity: 10 };
    expect(getItemStatus(item, getStockSummary(item, []))).toBe('IN_REPAIR');
  });

  it('respects the material team withdrawing an article', () => {
    const item = { ...tents, isDisabled: true };
    expect(getItemStatus(item, getStockSummary(item, []))).toBe('NOT_AVAILABLE');
  });
});

describe('getAvailableForPeriod', () => {
  const now = day(1);

  it('lets a request fit between two reservations that do not overlap each other', () => {
    const loans = [
      hold({ quantity: 6, startDate: day(10), endDate: day(12) }),
      hold({ quantity: 6, startDate: day(14), endDate: day(16) }),
    ];
    expect(getAvailableForPeriod(tents, loans, { start: day(9), end: day(17) }, now)).toBe(2);
  });

  it('adds up reservations that overlap each other', () => {
    const loans = [
      hold({ quantity: 3, startDate: day(10), endDate: day(14) }),
      hold({ quantity: 4, startDate: day(12), endDate: day(16) }),
    ];
    expect(getAvailableForPeriod(tents, loans, { start: day(11), end: day(13) }, now)).toBe(1);
  });

  it('treats a shared boundary day as overlapping', () => {
    const loans = [hold({ quantity: 8, startDate: day(10), endDate: day(12) })];
    expect(getAvailableForPeriod(tents, loans, { start: day(12), end: day(13) }, now)).toBe(0);
  });

  it('keeps an overdue loan holding its pieces until it is back', () => {
    const loans = [hold({ status: 'ISSUED', quantity: 5, startDate: day(2), endDate: day(4) })];
    const period = { start: day(6), end: day(7) };
    // overdue since day 4: it blocks every later period, not only the days until now
    expect(getAvailableForPeriod(tents, loans, period, day(5))).toBe(3);
    expect(getAvailableForPeriod(tents, loans, { start: day(20), end: day(21) }, day(5))).toBe(3);
    // still within its period on day 3, so it is promised back by day 4
    expect(getAvailableForPeriod(tents, loans, period, day(3))).toBe(8);
  });

  it('ignores cancelled and returned loans', () => {
    const loans = [
      hold({ status: 'CANCELLED', quantity: 8 }),
      hold({ status: 'RETURNED', quantity: 8 }),
    ];
    expect(getAvailableForPeriod(tents, loans, { start: day(10), end: day(12) }, now)).toBe(8);
  });
});

describe('getLoanDisplayStatus', () => {
  it('flags issued loans as due within a day and overdue after their end', () => {
    const loan = { status: 'ISSUED' as const, endDate: day(10) };
    expect(getLoanDisplayStatus(loan, day(5))).toBe('ISSUED');
    expect(getLoanDisplayStatus(loan, new Date(day(10).getTime() - 3_600_000))).toBe('RETURN_DUE');
    expect(getLoanDisplayStatus(loan, day(11))).toBe('OVERDUE');
  });

  it('never marks a reservation overdue', () => {
    expect(getLoanDisplayStatus({ status: 'RESERVED', endDate: day(1) }, day(5))).toBe('RESERVED');
  });
});
