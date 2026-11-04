/** Amounts are compared in Rappen, so 0.1 + 0.2 never decides whether a bill is paid. */
export const toRappen = (amount: number): number => Math.round(amount * 100);

/**
 * How much more than the bill a payment may be and still settle it, in CHF.
 *
 * Bills carry amounts like CHF 172.96, and whoever types the amount instead of scanning the
 * QR code rounds it up. Refunding a few francs costs more than it is worth, so the finance
 * team books the difference as rounding instead. An underpayment is never booked: the bill
 * would read as settled while money is still owed.
 */
export const OVERPAYMENT_TOLERANCE = 5;

/** `CHF 1'274.50`, the way the bill prints it. */
export const formatChf = (amount: number | null | undefined): string =>
  amount === null || amount === undefined
    ? 'CHF –'
    : `CHF ${new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
