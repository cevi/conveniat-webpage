import { countFittingItems } from '@/components/menu/use-fitting-item-count';

// Four items of 100px with a 10px gap, so their right edges sit at 100, 210, 320 and 430.
const rightEdges = [100, 210, 320, 430];
const overflowButtonWidth = 90;

describe('countFittingItems', () => {
  it('keeps every item when the whole row fits, without reserving room for the overflow button', () => {
    expect(countFittingItems(rightEdges, 430, overflowButtonWidth)).toBe(4);
  });

  it('moves items out until the overflow button fits behind the last one', () => {
    // 429px leaves 339px next to the button: the third item ends at 320 and still fits.
    expect(countFittingItems(rightEdges, 429, overflowButtonWidth)).toBe(3);
    expect(countFittingItems(rightEdges, 409, overflowButtonWidth)).toBe(2);
  });

  it('moves every item out when not even the first fits next to the overflow button', () => {
    expect(countFittingItems(rightEdges, 150, overflowButtonWidth)).toBe(0);
  });

  it('keeps an empty menu empty', () => {
    expect(countFittingItems([], 0, overflowButtonWidth)).toBe(0);
  });
});
