import { toQuantity } from '@/features/hof-dashboard/utils/order-form-state';

describe('toQuantity', () => {
  it('reads whole numbers within the limit and anything else as none', () => {
    expect(toQuantity('3.7')).toBe(3);
    expect(toQuantity('-4')).toBe(0);
    expect(toQuantity('')).toBe(0);
    expect(toQuantity('99999')).toBe(10_000);
  });
});
