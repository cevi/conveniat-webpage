import type { NfcFailureCode } from '@/features/wristbands/native-nfc';

/**
 * What the continuous scanner does after a session failed:
 * - `again`: the band slipped or answered badly; ask to hold it once more and keep scanning
 * - `refused`: this band cannot be used here; say why and what to do, keep scanning for the next
 * - `stop`: scanning cannot go on by itself (no band for a minute, NFC off, no NFC); stop and
 *   wait for "Weiter scannen"
 * - `quiet`: cancelled by the page itself, nothing to say
 */
export type ScanFailureKind = 'again' | 'refused' | 'stop' | 'quiet';

const KINDS: Record<NfcFailureCode, ScanFailureKind> = {
  cancelled: 'quiet',
  timeout: 'stop',
  disabled: 'stop',
  unsupported: 'stop',
  // a session of the page that has just been cancelled may still be ending
  busy: 'again',
  // "transceive fail" on Android reads as an unsupported tag, and holding it again helps
  'unsupported-tag': 'again',
  'tag-lost': 'again',
  'tap-again': 'again',
  'write-failed': 'again',
  'verification-failed': 'again',
  'credentials-timeout': 'again',
  'invalid-credentials': 'again',
  unknown: 'again',
  aborted: 'refused',
  'wrong-password': 'refused',
  'tag-locked': 'refused',
  'tag-too-small': 'refused',
  'password-unusable': 'refused',
  'invalid-url': 'refused',
};

export const scanFailureKind = (code: NfcFailureCode): ScanFailureKind => KINDS[code];
