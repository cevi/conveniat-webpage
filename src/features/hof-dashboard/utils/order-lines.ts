/** One line of a stored material order. */
export interface OrderLine {
  itemId: string;
  name: string;
  quantity: number;
}

/**
 * The lines to store for a material order, or the ids the list does not know.
 *
 * Every quantity must name material on the current list; the line takes its name from there,
 * in the one language every order is kept in. A material asked for twice counts once, with the
 * last quantity. Lines of material that has since left the list stay as they were ordered, so
 * editing the list never changes an order behind the Hof's back.
 */
export const buildOrderLines = (
  listNames: ReadonlyMap<string, string>,
  storedLines: readonly OrderLine[],
  quantities: readonly { itemId: string; quantity: number }[],
): { lines: OrderLine[]; unknownItemIds: string[] } => {
  const unknownItemIds = quantities
    .map(({ itemId }) => itemId)
    .filter((itemId) => !listNames.has(itemId));
  const latest = new Map(quantities.map(({ itemId, quantity }) => [itemId, quantity]));

  const ordered = [...latest].flatMap(([itemId, quantity]) => {
    const name = listNames.get(itemId);
    return name === undefined || quantity <= 0 ? [] : [{ itemId, name, quantity }];
  });
  const retired = storedLines
    .filter((line) => !listNames.has(line.itemId))
    .map(({ itemId, name, quantity }) => ({ itemId, name, quantity }));

  return { lines: [...ordered, ...retired], unknownItemIds };
};
