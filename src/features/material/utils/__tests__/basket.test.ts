import {
  basketLineCap,
  basketTotals,
  isOnOrderStep,
  mergeBasketLines,
  orderStepOf,
  stepQuantity,
} from '@/features/material/utils/basket';

describe('mergeBasketLines', () => {
  it('adds up the same article and sorts by article id, the order the server locks in', () => {
    expect(
      mergeBasketLines([
        { itemId: 'b', quantity: 2, isConsumption: false },
        { itemId: 'a', quantity: 1, isConsumption: false },
        { itemId: 'b', quantity: 3, isConsumption: false },
      ]),
    ).toEqual([
      { itemId: 'a', quantity: 1, isConsumption: false },
      { itemId: 'b', quantity: 5, isConsumption: false },
    ]);
  });

  it('only uses an article up when every line said so', () => {
    const merged = mergeBasketLines([
      { itemId: 'tape', quantity: 2, isConsumption: true },
      { itemId: 'tape', quantity: 1, isConsumption: false },
    ]);
    expect(merged).toEqual([{ itemId: 'tape', quantity: 3, isConsumption: false }]);
  });
});

describe('basketLineCap', () => {
  it('caps at what is free now and at the most one loan may take', () => {
    expect(basketLineCap({ available: 196, maxLoanQuantity: 80 })).toBe(80);
    expect(basketLineCap({ available: 3, maxLoanQuantity: 80 })).toBe(3);
  });

  it('counts what a prepared loan already holds as free for it', () => {
    expect(basketLineCap({ available: 0, maxLoanQuantity: 80, held: 12 })).toBe(12);
  });
});

describe('basketTotals', () => {
  it('counts the lines that still take something', () => {
    expect(basketTotals([{ quantity: 20 }, { quantity: 0 }, { quantity: 16 }])).toEqual({
      positions: 2,
      pieces: 36,
    });
  });
});

describe('order steps', () => {
  it('asks for multiples of the step', () => {
    expect(isOnOrderStep(30, 10)).toBe(true);
    expect(isOnOrderStep(25, 10)).toBe(false);
    expect(isOnOrderStep(7, 1)).toBe(true);
  });

  // eslint-disable-next-line unicorn/no-null -- the column reads as null nowhere, a stale cache as undefined
  it.each([undefined, null, 0, -5, 2.5, '10'])('asks one by one for a step of %p', (step) => {
    expect(orderStepOf(step)).toBe(1);
    expect(isOnOrderStep(7, step)).toBe(true);
  });

  it('steps from a quantity off the steps onto the next one', () => {
    expect(stepQuantity(0, 10, 1)).toBe(10);
    expect(stepQuantity(20, 10, 1)).toBe(30);
    expect(stepQuantity(20, 10, -1)).toBe(10);
    expect(stepQuantity(7, 5, 1)).toBe(10);
    expect(stepQuantity(7, 5, -1)).toBe(5);
    expect(stepQuantity(3, 1, -1)).toBe(2);
  });
});
