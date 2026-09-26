import { basketLineCap, basketTotals, mergeBasketLines } from '@/features/material/utils/basket';

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
