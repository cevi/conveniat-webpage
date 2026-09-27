import { HOF_ORDER_MAX_QUANTITY } from '@/features/hof-dashboard/constants';

/** An order as the form compares it: a whole quantity per material, and the power question. */
export interface OrderValues {
  quantities: Record<string, number>;
  powerConnection: boolean;
}

/** A typed quantity as a whole number within what can be ordered; anything else counts as none. */
export const toQuantity = (value: string | undefined): number => {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, HOF_ORDER_MAX_QUANTITY) : 0;
};

const quantityOf = (values: OrderValues, itemId: string): number => values.quantities[itemId] ?? 0;

/** Whether two orders ask for the same, a missing material counting as none of it. */
export const sameOrder = (a: OrderValues, b: OrderValues): boolean =>
  a.powerConnection === b.powerConnection &&
  [...new Set([...Object.keys(a.quantities), ...Object.keys(b.quantities)])].every(
    (itemId) => quantityOf(a, itemId) === quantityOf(b, itemId),
  );
