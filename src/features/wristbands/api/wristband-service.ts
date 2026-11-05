import { environmentVariables } from '@/config/environment-variables';
import { ACTIVE_REGISTRATION } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { BillParticipant, Wristband } from '@/features/payload-cms/payload-types';
import { deriveTagCredentials } from '@/features/wristbands/api/tag-password';
import type {
  HofBand,
  HofWristbandList,
  ProgramRefusal,
  ProgramWristbandResult,
  RegisterWristbandResult,
  RosterEntry,
  SpareRosterBand,
  WristbandIdentity,
  WristbandRoster,
} from '@/features/wristbands/types';
import { verifyNtagSignature } from '@/lib/nfc/ntag-signature';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import type { Payload, Where } from 'payload';

const logger = createLogger('wristbands');

/** Far more bands than the camp hands out, around 5000. */
const MAX_BANDS = 20_000;

/** Far more registrations than one Hof has. */
const MAX_REGISTRATIONS = 2000;

const idOf = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.id;

/** Whether the chip carries NXP's signature over its UID, or copies are let in for testing. */
const isGenuine = (uid: string, signature: string | null): boolean =>
  environmentVariables.NFC_ALLOW_UNSIGNED_TAGS ||
  (signature !== null && verifyNtagSignature(uid, signature));

const tagSecret = (): string => {
  const secret = environmentVariables.NFC_TAG_SECRET;
  if (secret === undefined) {
    // a deployment that turned the wristbands on without a key cannot program a single band
    logger.error('NFC_TAG_SECRET is not set, no band can be programmed');
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  }
  return secret;
};

const findBand = async (payload: Payload, uid: string): Promise<Wristband | undefined> => {
  const { docs } = await payload.find({
    collection: 'wristbands',
    where: { uid: { equals: uid } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  return docs[0];
};

/** The active registrations of a Hof's camp events: the people its AVP hands bands to. */
const findHofRegistrations = async (
  payload: Payload,
  hofId: string,
  registrationId?: string,
): Promise<Pick<BillParticipant, 'id' | 'fullName' | 'nickname'>[]> => {
  const hof = await payload.findByID({
    collection: 'hoefe',
    id: hofId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { events: true },
  });
  const eventIds = (hof?.events ?? []).map((event) => event.eventId);
  if (eventIds.length === 0) return [];

  const { docs } = await payload.find({
    collection: 'bill-participants',
    where: {
      and: [
        { eventId: { in: eventIds } },
        ACTIVE_REGISTRATION,
        ...(registrationId === undefined ? [] : [{ id: { equals: registrationId } }]),
      ],
    },
    depth: 0,
    limit: MAX_REGISTRATIONS,
    pagination: false,
    overrideAccess: true,
    sort: 'fullName',
    select: { fullName: true, nickname: true },
  });
  return docs;
};

/** Every registration of a Hof with the band the person wears, and the bands not handed out. */
export const getHofWristbandList = async (
  payload: Payload,
  hofId: string,
): Promise<HofWristbandList> => {
  const [registrations, bands] = await Promise.all([
    findHofRegistrations(payload, hofId),
    payload.find({
      collection: 'wristbands',
      where: { and: [{ hof: { equals: hofId } }, { status: { equals: 'active' } }] },
      depth: 0,
      limit: MAX_BANDS,
      pagination: false,
      overrideAccess: true,
      select: { uid: true, status: true, participant: true },
    }),
  ]);

  const bandOfRegistration = new Map<string, HofBand>();
  const spareBands: HofBand[] = [];
  for (const band of bands.docs) {
    const registrationId = idOf(band.participant);
    const entry = { uid: band.uid, status: band.status };
    if (registrationId === undefined) spareBands.push(entry);
    else bandOfRegistration.set(registrationId, entry);
  }

  return {
    people: registrations.map((registration) => ({
      registrationId: registration.id,
      fullName: registration.fullName,
      nickname: registration.nickname ?? null,
      band: bandOfRegistration.get(registration.id) ?? null,
    })),
    spareBands,
  };
};

/** Why the Hof may not program this band, or undefined if it may. */
const findRefusal = async (
  payload: Payload,
  input: { hofId: string; uid: string; signature: string | null },
): Promise<{ refusal: ProgramRefusal | undefined; band: Wristband | undefined }> => {
  const { hofId, uid, signature } = input;
  if (!isGenuine(uid, signature)) {
    logger.warn('Refused to program a band without a valid NXP signature', {
      'wristband.uid': uid,
      'wristband.signature': signature === null ? 'missing' : 'invalid',
    });
    return { refusal: 'not-genuine', band: undefined };
  }
  const band = await findBand(payload, uid);
  if (band?.status === 'revoked') return { refusal: 'revoked', band };
  if (band !== undefined && idOf(band.hof) !== hofId) return { refusal: 'assigned-to-other', band };
  return { refusal: undefined, band };
};

/**
 * The write password of a band, for the AVP programming it. Refused for a chip without NXP's
 * signature, a blocked band and one another Hof programmed. Asked while the band lies on the
 * phone, so it only reads; the band is recorded once the phone says it is written, see
 * `registerWristband`.
 */
export const programWristband = async (
  payload: Payload,
  input: { hofId: string; uid: string; signature: string | null },
): Promise<ProgramWristbandResult> => {
  const { refusal } = await findRefusal(payload, input);
  if (refusal !== undefined) return { ok: false, reason: refusal };
  return { ok: true, ...deriveTagCredentials(input.uid, tagSecret()) };
};

/**
 * Records a band for the Hof once the phone reports it written, so a cancelled scan or a failed
 * write leaves no band behind that was never programmed. Checks again what `programWristband`
 * checked: another Hof may have recorded the same band in between.
 *
 * Two phones may report the same band at once, a retry after a lost answer among them. The UID
 * is unique, so the later create fails; the band is then read again and judged as it stands.
 */
export const registerWristband = async (
  payload: Payload,
  input: { hofId: string; uid: string; signature: string | null; userId: string },
): Promise<RegisterWristbandResult> => {
  const { hofId, uid, userId } = input;
  const { refusal, band } = await findRefusal(payload, input);
  if (refusal !== undefined) return { ok: false, reason: refusal };
  if (band !== undefined) return { ok: true };

  try {
    await payload.create({
      collection: 'wristbands',
      data: { uid, hof: hofId, status: 'active', programmedBy: userId, lastEditedByUser: userId },
      overrideAccess: true,
    });
  } catch (error) {
    const recorded = await findRefusal(payload, input);
    if (recorded.band === undefined) throw error;
    logger.debug('Another request recorded the same band first', {
      'wristband.uid': uid,
      'wristband.hof': hofId,
    });
    return recorded.refusal === undefined ? { ok: true } : { ok: false, reason: recorded.refusal };
  }
  logger.info('Programmed a new band', { 'wristband.uid': uid, 'wristband.hof': hofId });
  return { ok: true };
};

/** A band of the Hof, or an error the AVP can act on. */
const findBandOfHof = async (payload: Payload, hofId: string, uid: string): Promise<Wristband> => {
  const band = await findBand(payload, uid);
  if (band === undefined) throw new TRPCError({ code: 'NOT_FOUND', message: 'band_unknown' });
  if (idOf(band.hof) !== hofId)
    throw new TRPCError({ code: 'FORBIDDEN', message: 'band_of_other_hof' });
  return band;
};

/** The active bands of a registration, oldest first. */
const findActiveBandIds = async (payload: Payload, registrationId: string): Promise<string[]> => {
  const { docs } = await payload.find({
    collection: 'wristbands',
    where: { and: [{ participant: { equals: registrationId } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: MAX_BANDS,
    pagination: false,
    overrideAccess: true,
    select: { status: true },
  });
  return docs.map((document) => document.id).toSorted();
};

/**
 * Hands a band of the Hof to one of its registrations, or moves it from the person who wore it.
 * Someone who still wears an active band gets no second one: their old band is blocked first.
 *
 * The check before the write cannot see a second phone handing the same person another band at
 * the same moment, so the bands are counted again after it. Of two bands written together the
 * older one stays, by its id, which both requests agree on; the other goes back to whoever wore
 * it before and its request is refused like the check before the write would have.
 */
export const assignWristband = async (
  payload: Payload,
  input: { hofId: string; uid: string; registrationId: string; userId: string },
): Promise<void> => {
  const { hofId, uid, registrationId, userId } = input;
  const band = await findBandOfHof(payload, hofId, uid);
  if (band.status === 'revoked') throw new TRPCError({ code: 'CONFLICT', message: 'band_revoked' });

  const [registration] = await findHofRegistrations(payload, hofId, registrationId);
  if (registration === undefined) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'registration_not_in_hof' });
  }

  const previousWearer = idOf(band.participant) ?? null;
  const wearsOtherBand = async (): Promise<boolean> => {
    const activeBandIds = await findActiveBandIds(payload, registrationId);
    return activeBandIds.some((id) => id !== band.id);
  };
  if (await wearsOtherBand()) throw new TRPCError({ code: 'CONFLICT', message: 'person_has_band' });

  try {
    await payload.update({
      collection: 'wristbands',
      id: band.id,
      data: { participant: registrationId, lastEditedByUser: userId },
      overrideAccess: true,
    });
  } catch (error) {
    // the collection checks the same, and refuses a band written in between like the check above
    if (await wearsOtherBand()) {
      throw new TRPCError({ code: 'CONFLICT', message: 'person_has_band' });
    }
    throw error;
  }

  const [kept] = await findActiveBandIds(payload, registrationId);
  if (kept !== undefined && kept !== band.id) {
    await payload.update({
      collection: 'wristbands',
      id: band.id,
      data: { participant: previousWearer, lastEditedByUser: userId },
      overrideAccess: true,
    });
    logger.warn('Undid a band handed out at the same time as another one to the same person', {
      'wristband.uid': uid,
      'wristband.hof': hofId,
    });
    throw new TRPCError({ code: 'CONFLICT', message: 'person_has_band' });
  }
  logger.info('Handed out a band', { 'wristband.uid': uid, 'wristband.hof': hofId });
};

/**
 * Takes a band back from the person who wore it; it stays the Hof's, ready for someone else. A
 * blocked band is refused: it keeps whose it was, see `revokeWristband`.
 */
export const unassignWristband = async (
  payload: Payload,
  input: { hofId: string; uid: string; userId: string },
): Promise<void> => {
  const band = await findBandOfHof(payload, input.hofId, input.uid);
  if (band.status === 'revoked') throw new TRPCError({ code: 'CONFLICT', message: 'band_revoked' });
  await payload.update({
    collection: 'wristbands',
    id: band.id,
    data: { participant: null, lastEditedByUser: input.userId },
    overrideAccess: true,
  });
  logger.info('Took a band back', { 'wristband.uid': input.uid, 'wristband.hof': input.hofId });
};

/**
 * Blocks a lost or stolen band, so a read names nobody. The registration stays on it, so the
 * admin panel shows whose it was; only admin and web unblock a band again.
 */
export const revokeWristband = async (
  payload: Payload,
  input: { hofId: string; uid: string; userId: string },
): Promise<void> => {
  const band = await findBandOfHof(payload, input.hofId, input.uid);
  await payload.update({
    collection: 'wristbands',
    id: band.id,
    data: { status: 'revoked', lastEditedByUser: input.userId },
    overrideAccess: true,
  });
  logger.info('Blocked a band', { 'wristband.uid': input.uid, 'wristband.hof': input.hofId });
};

/** A band with its wearer, Hof and Quartier filled in. */
type PopulatedBand = Pick<Wristband, 'id' | 'uid' | 'status' | 'participant' | 'hof'>;

const findPopulatedBands = async (
  payload: Payload,
  where: Where,
  limit: number,
): Promise<PopulatedBand[]> => {
  const { docs } = await payload.find({
    collection: 'wristbands',
    where,
    depth: 2,
    limit,
    pagination: false,
    overrideAccess: true,
    select: { uid: true, status: true, participant: true, hof: true },
    populate: {
      'bill-participants': { fullName: true, nickname: true },
      hoefe: { name: true, quartier: true },
      quartiere: { name: true },
    },
  });
  return docs;
};

const hofNames = (hof: Wristband['hof']): { hof: string; quartier: string | null } => {
  if (typeof hof === 'string') return { hof: '', quartier: null };
  const { quartier } = hof;
  return {
    hof: hof.name,
    quartier: typeof quartier === 'object' && quartier !== null ? quartier.name : null,
  };
};

/** The wearer of a band, or null if it is not handed out or its registration is gone. */
const toRosterEntry = (band: PopulatedBand): RosterEntry | null => {
  const registration = band.participant;
  if (typeof registration !== 'object' || registration === null) return null;
  return {
    uid: band.uid,
    fullName: registration.fullName,
    nickname: registration.nickname ?? null,
    ...hofNames(band.hof),
  };
};

/**
 * Whose a band is, for security and first aid. With the signature from a tap in the app it is
 * checked against NXP's key; a cold tap opens `/tag/{uid}` with the UID alone, and the answer
 * says it was not checked. Every read is logged at debug, with who read it.
 */
export const identifyWristband = async (
  payload: Payload,
  input: { uid: string; signature: string | null; readerId: string },
): Promise<WristbandIdentity> => {
  const { uid, signature, readerId } = input;
  const verified = signature !== null;
  if (verified && !isGenuine(uid, signature)) {
    logger.warn('A band read with an invalid NXP signature', {
      'wristband.uid': uid,
      'wristband.reader': readerId,
    });
    return { state: 'not-genuine', uid };
  }

  const [band] = await findPopulatedBands(payload, { uid: { equals: uid } }, 1);
  logger.debug('Read a band', {
    'wristband.uid': uid,
    'wristband.reader': readerId,
    'wristband.verified': verified,
    'wristband.known': band !== undefined,
  });

  if (band === undefined) return { state: 'unknown', uid };
  if (band.status === 'revoked') return { state: 'revoked', uid };
  const wearer = toRosterEntry(band);
  if (wearer === null) return { state: 'unassigned', uid, hof: hofNames(band.hof).hof };
  return { state: 'assigned', ...wearer, verified };
};

/**
 * Every band, kept offline by the phones of security and first aid: the worn ones with their
 * wearer, the spare ones with their Hof and the blocked ones, so a phone offline answers what
 * `identifyWristband` would.
 */
export const getWristbandRoster = async (
  payload: Payload,
  readerId: string,
): Promise<WristbandRoster> => {
  const bands = await findPopulatedBands(payload, {}, MAX_BANDS);
  const worn: RosterEntry[] = [];
  const spareBands: SpareRosterBand[] = [];
  const revokedUids: string[] = [];
  for (const band of bands) {
    if (band.status === 'revoked') {
      revokedUids.push(band.uid);
      continue;
    }
    const entry = toRosterEntry(band);
    if (entry === null) spareBands.push({ uid: band.uid, hof: hofNames(band.hof).hof });
    else worn.push(entry);
  }
  const roster: WristbandRoster = { bands: worn, spareBands, revokedUids };
  logger.debug('Loaded the wristband roster', {
    'wristband.reader': readerId,
    'wristband.bands': worn.length,
    'wristband.spare_bands': spareBands.length,
  });
  return roster;
};
