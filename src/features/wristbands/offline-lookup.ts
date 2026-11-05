import type {
  RosterEntry,
  SpareRosterBand,
  WristbandIdentity,
  WristbandRoster,
} from '@/features/wristbands/types';
import { verifyNtagSignature } from '@/lib/nfc/ntag-signature';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** One entry of a roster restored from the phone, or null if it is not one. */
const toRosterEntry = (value: unknown): RosterEntry | null => {
  if (!isRecord(value)) return null;
  const { uid, fullName, hof } = value;
  if (typeof uid !== 'string' || typeof fullName !== 'string') return null;
  return {
    uid: uid.toUpperCase(),
    fullName,
    nickname: stringOrNull(value['nickname']),
    hof: typeof hof === 'string' ? hof : '',
    quartier: stringOrNull(value['quartier']),
  };
};

/** One spare band of a roster restored from the phone, or null if it is not one. */
const toSpareBand = (value: unknown): SpareRosterBand | null => {
  if (!isRecord(value) || typeof value['uid'] !== 'string') return null;
  return {
    uid: value['uid'].toUpperCase(),
    hof: typeof value['hof'] === 'string' ? value['hof'] : '',
  };
};

/**
 * Whose a band is, answered from the list security and first aid keep on the phone, when the
 * server cannot be asked. Checks NXP's signature like the server does; without one it names the
 * wearer and says it was not checked, like a cold tap.
 *
 * The list comes from the persisted query cache, which a phone restores from an older version
 * of the app, so every field is read as if it could be missing.
 */
export const identifyFromRoster = (
  roster: WristbandRoster | undefined,
  input: { uid: string; signature: string | null },
): WristbandIdentity => {
  const uid = input.uid.toUpperCase();
  const { signature } = input;
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

  const bands: unknown = isRecord(record) ? record['bands'] : undefined;
  const wearer = (Array.isArray(bands) ? bands : [])
    .map((band) => toRosterEntry(band))
    .find((entry) => entry?.uid === uid);
  if (wearer !== undefined && wearer !== null) {
    return { state: 'assigned', ...wearer, verified: signature !== null };
  }

  // a list from before the spare bands were on it has none, and reads them as unknown
  const spareBands: unknown = isRecord(record) ? record['spareBands'] : undefined;
  const spare = (Array.isArray(spareBands) ? spareBands : [])
    .map((band) => toSpareBand(band))
    .find((entry) => entry?.uid === uid);
  if (spare !== undefined && spare !== null) return { state: 'unassigned', ...spare };
  return { state: 'unknown', uid };
};
