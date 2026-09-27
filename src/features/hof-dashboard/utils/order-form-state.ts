import { HOF_ORDER_MAX_QUANTITY } from '@/features/hof-dashboard/constants';

/** An order as the form compares it: a whole quantity per material, and the power question. */
export interface OrderValues {
  quantities: Record<string, number>;
  powerConnection: boolean;
}

/**
 * A typed quantity as a whole number within what can be ordered, or undefined when it is not
 * one, so the form can say so instead of saving some other number. Empty is none, and "1'000"
 * counts, as the Swiss write it.
 */
export const parseQuantity = (typed: string): number | undefined => {
  const digits = typed.replaceAll("'", '').trim();
  if (!/^\d*$/.test(digits)) return undefined;
  const quantity = digits === '' ? 0 : Number(digits);
  return quantity <= HOF_ORDER_MAX_QUANTITY ? quantity : undefined;
};

const quantityOf = (values: OrderValues, itemId: string): number => values.quantities[itemId] ?? 0;

/** Whether two orders ask for the same, a missing material counting as none of it. */
export const sameOrder = (a: OrderValues, b: OrderValues): boolean =>
  a.powerConnection === b.powerConnection &&
  [...new Set([...Object.keys(a.quantities), ...Object.keys(b.quantities)])].every(
    (itemId) => quantityOf(a, itemId) === quantityOf(b, itemId),
  );
