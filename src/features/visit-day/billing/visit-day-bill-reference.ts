import {
  BILL_REFERENCE_PREFIXES,
  calculateModule10Recursive,
} from '@/features/billing-core/qr-reference';

const BILL_NUMBER_DIGITS = 18;
const ISSUE_DIGITS = 5;

/**
 * The QR reference of a Besuchstag bill: `091`, the registration's bill number in 18 digits,
 * which issue of its bill this is in 5, and the check digit, 27 digits in all.
 *
 * The bill number is a Postgres sequence, so two references never meet, and the issue counts
 * up when a bill is issued again, e.g. for fewer persons, so the replaced bill keeps a
 * reference of its own that the import still recognises.
 */
export const visitDayBillReference = (billNumber: number, issue: number): string => {
  const base =
    BILL_REFERENCE_PREFIXES.visitDay +
    String(billNumber).padStart(BILL_NUMBER_DIGITS, '0') +
    String(issue).padStart(ISSUE_DIGITS, '0');
  return `${base}${String(calculateModule10Recursive(base))}`;
};

/**
 * The bill number printed on the bill and named in the QR code's message, e.g. `BT2027-0042`,
 * and `BT2027-0042-2` from its second issue on. `{{year}}` in the prefix is the year of issue.
 */
export const visitDayInvoiceNumber = (
  prefix: string,
  billNumber: number,
  issue: number,
  issuedAt: Date,
): string => {
  const filled = prefix.replaceAll('{{year}}', String(issuedAt.getUTCFullYear()));
  const number = `${filled}${String(billNumber).padStart(4, '0')}`;
  return issue > 1 ? `${number}-${String(issue)}` : number;
};
