import { parseQuantity } from '@/features/hof-dashboard/utils/order-form-state';

describe('parseQuantity', () => {
  it('reads whole numbers within the limit, as the Swiss write them', () => {
    expect(parseQuantity('3')).toBe(3);
    expect(parseQuantity("1'000")).toBe(1000);
    expect(parseQuantity('')).toBe(0);
    expect(parseQuantity('10000')).toBe(10_000);
  });

  it('reads anything else as no quantity, rather than as some other number', () => {
    expect(parseQuantity('2.5')).toBeUndefined();
    expect(parseQuantity('-4')).toBeUndefined();
    expect(parseQuantity('abc')).toBeUndefined();
    expect(parseQuantity('10001')).toBeUndefined();
  });
});
