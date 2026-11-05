/**
 * The most of one item a single booking, return, loan limit or order step may hold. An item never
 * allows a loan larger than a booking may be.
 */
export const MAX_QUANTITY = 100_000;

/**
 * The most of one item the depot may count in stock, its low-stock threshold or a repair. Larger
 * than {@link MAX_QUANTITY}: the stock of a consumable may exceed what one booking takes.
 */
export const MAX_STOCK_QUANTITY = 1_000_000;
