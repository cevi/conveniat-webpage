import { openBand } from '@/features/wristbands/sealed-roster';
import type { SealedWristbandRoster, WristbandIdentity } from '@/features/wristbands/types';
import { verifyNtagSignature } from '@/lib/nfc/ntag-signature';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Whose a band is, answered from the list security and first aid keep on the phone, when the
 * server cannot be asked. Checks NXP's signature like the server does, then opens the band's
 * entry with the key its UID and signature give, see `sealed-roster.ts`.
 *
 * Undefined when the read brought no signature and the list has no entry for the UID alone:
 * without the signature the list names nobody, which is not the same as a band nobody knows.
 * Only a test sticker, let in by `NFC_ALLOW_UNSIGNED_TAGS`, has an entry under its UID alone.
 *
 * The list comes from the persisted query cache, which a phone restores from an older version
 * of the app, so every field is read as if it could be missing.
 */
export const identifyFromRoster = async (
  roster: SealedWristbandRoster | undefined,
  input: { uid: string; signature: string | null },
): Promise<WristbandIdentity | undefined> => {
  const uid = input.uid.toUpperCase();
  const signature = input.signature?.toUpperCase() ?? null;
  if (signature !== null && !verifyNtagSignature(uid, signature)) {
    return { state: 'not-genuine', uid };
  }

  const record: unknown = roster;
  const revokedUids: unknown = isRecord(record) ? record['revokedUids'] : undefined;
  if (
    Array.isArray(revokedUids) &&
    revokedUids.some((revoked) => typeof revoked === 'string' && revoked.toUpperCase() === uid)
  ) {
    return { state: 'revoked', uid };
  }

  const band = await openBand(isRecord(record) ? record['entries'] : undefined, {
    uid,
    signature,
  });
  if (band === undefined) return signature === null ? undefined : { state: 'unknown', uid };
  if ('fullName' in band) {
    return { state: 'assigned', uid, ...band, verified: signature !== null };
  }
  return { state: 'unassigned', uid, hof: band.hof };
};
