export interface BasketLine {
  itemId: string;
  quantity: number;
  isConsumption: boolean;
}

/**
 * One line per article, sorted by article id, which is the order the server locks the
 * articles in. The same article twice adds up; it is only used up when every line said so,
 * since a consumption takes the pieces out of the stock for good.
 */
export const mergeBasketLines = (lines: readonly BasketLine[]): BasketLine[] => {
  const merged = new Map<string, BasketLine>();
  for (const line of lines) {
    const current = merged.get(line.itemId);
    merged.set(
      line.itemId,
      current === undefined
        ? { ...line }
        : {
            itemId: line.itemId,
            quantity: current.quantity + line.quantity,
            isConsumption: current.isConsumption && line.isConsumption,
          },
    );
  }
  return [...merged.values()].toSorted((a, b) => (a.itemId < b.itemId ? -1 : 1));
};

/**
 * The most a basket line may ask for: what is free now, plus what a prepared loan the line
 * takes over already holds, and never more than one loan may take.
 */
export const basketLineCap = ({
  available,
  maxLoanQuantity,
  held = 0,
}: {
  available: number;
  maxLoanQuantity: number;
  held?: number;
}): number => Math.max(0, Math.min(available + held, maxLoanQuantity));

/** "3 lines, 36 pieces" for the basket's button. */
export const basketTotals = (
  lines: readonly { quantity: number }[],
): { positions: number; pieces: number } => {
  const counted = lines.filter((line) => line.quantity > 0);
  return {
    positions: counted.length,
    pieces: counted.reduce((sum, line) => sum + line.quantity, 0),
  };
};
