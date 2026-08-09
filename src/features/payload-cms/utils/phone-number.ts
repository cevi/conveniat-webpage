/**
 * Converts a phone number as entered by an editor (e.g. `+41 79 316 83 49`)
 * into a dialable `tel:` URI (e.g. `tel:+41793168349`).
 *
 * Everything that cannot be dialed is stripped: spaces, dashes, dots, slashes
 * and the national trunk prefix written as `(0)`. A `00` country prefix is
 * normalized to `+`.
 *
 * @param phoneNumber the raw phone number entered in the CMS
 * @returns the `tel:` URI, or an empty string if the input holds no digits
 */
export const phoneNumberToTelHref = (phoneNumber: string): string => {
  let cleaned = phoneNumber.trim().replace(/^tel:/i, '').trim();

  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  const isInternational = cleaned.startsWith('+');
  if (isInternational) {
    // drop the national trunk prefix, e.g. +41 (0)79 ... --> +41 79 ...
    cleaned = cleaned.replace(/\(\s*0\s*\)/, '');
  }

  const digits = cleaned.replaceAll(/\D/g, '');
  if (digits === '') return '';

  return `tel:${isInternational ? '+' : ''}${digits}`;
};
