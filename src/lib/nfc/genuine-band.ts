import { environmentVariables } from '@/config/environment-variables';
import { verifyNtagSignature } from '@/lib/nfc/ntag-signature';

/**
 * Whether a band was really held to a phone: its chip carries NXP's signature over the UID, or
 * the deployment lets copies without one in for testing (`NFC_ALLOW_UNSIGNED_TAGS`). A UID
 * alone proves nothing: those of one batch differ in a byte and can be guessed. Server only,
 * the wristbands and the chat both decide by it.
 */
export const isGenuineBand = (uid: string, signature: string | null): boolean =>
  environmentVariables.NFC_ALLOW_UNSIGNED_TAGS ||
  (signature !== null && verifyNtagSignature(uid, signature));
