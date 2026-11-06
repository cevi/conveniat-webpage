/*
The list of bands that security and first aid keep on the phone, sealed band by band. Each
entry is encrypted with a key derived from the band's UID and NXP signature, and only reading
the band gives the signature: a UID can be guessed, the signature cannot. A phone that is lost
therefore names nobody; whoever finds it learns of a band only what holding that band to it
tells, which is what the server would tell security and first aid as well.

The server keeps the derived key of every band, never its signature, which would be a pass to
the wearer's chat, see `startChatFromWristband`. Server and phone run this same code on Web
Crypto, so both derive the same keys.
*/

import type { RosterEntry } from '@/features/wristbands/types';

/** What an entry holds: the wearer of a worn band, or the Hof of a spare one. */
export type SealedBand = Omit<RosterEntry, 'uid'> | { hof: string };

/** One band of the list, found by `index` and opened with the key only the band gives. */
export interface SealedRosterEntry {
  index: string;
  /** the 12-byte IV followed by the AES-GCM ciphertext, base64 */
  box: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const IV_LENGTH = 12;

const hexBytes = (hex: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(hex.match(/[0-9A-Fa-f]{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCodePoint(...bytes));

const fromBase64 = (text: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(text), (character) => character.codePointAt(0) ?? 0);

const hkdf = async (
  material: Uint8Array<ArrayBuffer>,
  info: string,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> => {
  const key = await crypto.subtle.importKey('raw', material, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
};

/**
 * The key of a band, as hex: HKDF-SHA256 over its UID and NXP signature. A test sticker without
 * a signature, which only `NFC_ALLOW_UNSIGNED_TAGS` lets in, gets one from its UID alone.
 */
export const deriveBandKey = async (uid: string, signature: string | null): Promise<string> => {
  const key = await hkdf(hexBytes(uid + (signature ?? '')), 'conveniat27 wristband roster', 32);
  return Array.from(key, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

/** The index an entry is found by and the AES key it is sealed with, both from the band's key. */
const entryKeys = async (bandKey: string): Promise<{ index: string; key: CryptoKey }> => {
  const material = hexBytes(bandKey);
  const [index, secret] = await Promise.all([
    hkdf(material, 'index', 16),
    hkdf(material, 'aes-256-gcm', 32),
  ]);
  const key = await crypto.subtle.importKey('raw', secret, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  return { index: toBase64(index), key };
};

/** Seals what the list says about one band under the band's key. */
export const sealBand = async (bandKey: string, band: SealedBand): Promise<SealedRosterEntry> => {
  const { index, key } = await entryKeys(bandKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(band))),
  );
  const box = new Uint8Array(IV_LENGTH + ciphertext.length);
  box.set(iv);
  box.set(ciphertext, IV_LENGTH);
  return { index, box: toBase64(box) };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** What an opened entry says, read as if a field could be missing. */
const toSealedBand = (value: unknown): SealedBand | undefined => {
  if (!isRecord(value)) return undefined;
  const hof = typeof value['hof'] === 'string' ? value['hof'] : '';
  if (typeof value['fullName'] !== 'string') return { hof };
  return {
    fullName: value['fullName'],
    nickname: stringOrNull(value['nickname']),
    hof,
    quartier: stringOrNull(value['quartier']),
  };
};

/**
 * Finds the entry of the band just read and opens it, or undefined if the list holds none for
 * this UID and signature. The entries come from the persisted query cache, so anything that is
 * not an entry is skipped.
 */
export const openBand = async (
  entries: unknown,
  band: { uid: string; signature: string | null },
): Promise<SealedBand | undefined> => {
  const { index, key } = await entryKeys(await deriveBandKey(band.uid, band.signature));
  const entry = (Array.isArray(entries) ? (entries as unknown[]) : []).find(
    (candidate) => isRecord(candidate) && candidate['index'] === index,
  );
  if (!isRecord(entry) || typeof entry['box'] !== 'string') return undefined;
  try {
    const box = fromBase64(entry['box']);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: box.slice(0, IV_LENGTH) },
      key,
      box.slice(IV_LENGTH),
    );
    return toSealedBand(JSON.parse(decoder.decode(plaintext)));
  } catch {
    // an entry that does not open under this band's key is not this band's
    return undefined;
  }
};
