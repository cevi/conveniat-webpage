import { followsStoredOrder, toQuantity } from '@/features/hof-dashboard/utils/order-form-state';

const order = (
  rope: number,
  powerConnection = false,
): { quantities: Record<string, number>; powerConnection: boolean } => ({
  quantities: { rope },
  powerConnection,
});

describe('followsStoredOrder', () => {
  it("follows a reviewer's correction while the Hof has changed nothing, or undone its change", () => {
    expect(followsStoredOrder(order(5), order(5), order(3))).toBe(true);
  });

  it("keeps what the Hof typed and has not saved, e.g. during its own save's round trip", () => {
    expect(followsStoredOrder(order(11), order(5), order(9))).toBe(false);
  });

  it('follows its own save', () => {
    expect(followsStoredOrder(order(9), order(5), order(9))).toBe(true);
  });

  it('counts the power question too', () => {
    expect(followsStoredOrder(order(5, true), order(5), order(5))).toBe(false);
  });

  it('treats a material missing on one side as none of it', () => {
    expect(followsStoredOrder({ quantities: {}, powerConnection: false }, order(0), order(2))).toBe(
      true,
    );
  });
});

describe('toQuantity', () => {
  it('reads whole numbers within the limit and anything else as none', () => {
    expect(toQuantity('3.7')).toBe(3);
    expect(toQuantity('-4')).toBe(0);
    expect(toQuantity('')).toBe(0);
    expect(toQuantity('99999')).toBe(10_000);
  });
});
