import { environmentVariables } from '@/config/environment-variables';
import { abteilungOfEventName } from '@/features/payload-cms/payload-cms/utils/abteilung-name';
import {
  ACTIVE_REGISTRATION,
  isParticipantRole,
} from '@/features/payload-cms/payload-cms/utils/hof-membership';
import {
  BAND_REGISTRATION_FIELDS,
  findAppUserOfPerson,
  findHofAdministrators,
  shortNameOf,
  toBandWearer,
} from '@/features/payload-cms/payload-cms/utils/wristband-people';
import type { BillParticipant, Wristband } from '@/features/payload-cms/payload-types';
import { deriveTagCredentials } from '@/features/wristbands/api/tag-password';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import type { SealedBand } from '@/features/wristbands/sealed-roster';
import { deriveBandKey, sealBand } from '@/features/wristbands/sealed-roster';
import type {
  HofBand,
  HofWristbandList,
  ProgramRefusal,
  ProgramWristbandResult,
  RegisterWristbandResult,
  RosterEntry,
  SealedWristbandRoster,
  WristbandCard,
  WristbandIdentity,
} from '@/features/wristbands/types';
import { isGenuineBand } from '@/lib/nfc/genuine-band';
import { createErrorThrower } from '@/trpc/error-formatter';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import type { Payload, Where } from 'payload';

const logger = createLogger('wristbands');

/** A refusal the AVP's page translates, see `wristbandErrorTexts`. */
const wristbandError = createErrorThrower(wristbandErrorTexts);

/** Far more bands than the camp hands out, around 5000. */
const MAX_BANDS = 20_000;

/** Far more registrations than one Hof has. */
const MAX_REGISTRATIONS = 2000;

const idOf = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.id;

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
    showHiddenFields: true,
  });
  return docs[0];
};

/**
 * Stores the key of a band that has none yet, for its entry in the offline list: a band
 * programmed before the list was sealed, once a read brings its signature. Only for a signature
 * `isGenuineBand` accepted.
 */
const rememberBandKey = async (
  payload: Payload,
  band: Pick<Wristband, 'id' | 'rosterKey'>,
  input: { uid: string; signature: string | null },
): Promise<void> => {
  if (typeof band.rosterKey === 'string' && band.rosterKey !== '') return;
  await payload.update({
    collection: 'wristbands',
    id: band.id,
    data: { rosterKey: await deriveBandKey(input.uid, input.signature) },
    overrideAccess: true,
  });
  logger.debug('Stored the roster key of a band', { 'wristband.uid': input.uid });
};

type HofRegistration = Pick<
  BillParticipant,
  'id' | 'fullName' | 'nickname' | 'eventName' | 'roleType' | 'userId'
>;

/** The active registrations of a Hof's camp events: the people its AVP hands bands to. */
const findHofRegistrations = async (
  payload: Payload,
  hofId: string,
  registrationId?: string,
): Promise<HofRegistration[]> => {
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
    select: { fullName: true, nickname: true, eventName: true, roleType: true, userId: true },
  });
  return docs;
};

/** The Cevi.DB ids of the helpers the AVP of a Hof named. */
const findHelperPersonIds = async (payload: Payload, hofId: string): Promise<Set<string>> => {
  const { docs } = await payload.find({
    collection: 'wristband-helpers',
    where: { hof: { equals: hofId } },
    depth: 0,
    limit: MAX_REGISTRATIONS,
    pagination: false,
    overrideAccess: true,
    select: { personId: true },
  });
  return new Set(docs.map((helper) => helper.personId));
};

/** Every registration of a Hof with the band the person wears, and the bands not handed out. */
export const getHofWristbandList = async (
  payload: Payload,
  hofId: string,
): Promise<HofWristbandList> => {
  const [registrations, helpers, bands] = await Promise.all([
    findHofRegistrations(payload, hofId),
    findHelperPersonIds(payload, hofId),
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
      abteilung: abteilungOfEventName(registration.eventName),
      // a registration without a role counts as a participant: nobody leads by a gap in the data
      role:
        typeof registration.roleType === 'string' &&
        registration.roleType !== '' &&
        !isParticipantRole(registration.roleType)
          ? 'leader'
          : 'participant',
      band: bandOfRegistration.get(registration.id) ?? null,
      helper: helpers.has(registration.userId),
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
  if (!isGenuineBand(uid, signature)) {
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
  if (band !== undefined) {
    await rememberBandKey(payload, band, input);
    return { ok: true };
  }

  try {
    await payload.create({
      collection: 'wristbands',
      data: {
        uid,
        hof: hofId,
        status: 'active',
        programmedBy: userId,
        lastEditedByUser: userId,
        rosterKey: await deriveBandKey(uid, input.signature),
      },
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
  if (band === undefined) throw wristbandError('NOT_FOUND', 'bandUnknown');
  if (idOf(band.hof) !== hofId) throw wristbandError('FORBIDDEN', 'bandOfOtherHof');
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

interface AssignInput {
  hofId: string;
  uid: string;
  registrationId: string;
  userId: string;
}

/**
 * Whether a band of the Hof can go to one of its registrations: active, and worn by nobody who
 * is still registered at the Hof. A band whose wearer's registration ended goes to the next
 * person; one an active person wears is refused, even when a phone's list did not know yet,
 * like a second station that has not seen the first one hand it out.
 */
const checkAssignable = async (
  payload: Payload,
  { hofId, uid, registrationId }: AssignInput,
): Promise<{ band: Wristband; previousWearer: string | null }> => {
  const band = await findBandOfHof(payload, hofId, uid);
  if (band.status === 'revoked') throw wristbandError('CONFLICT', 'bandRevoked');

  const [registration] = await findHofRegistrations(payload, hofId, registrationId);
  if (registration === undefined) {
    throw wristbandError('NOT_FOUND', 'registrationNotInHof');
  }

  const previousWearer = idOf(band.participant) ?? null;
  if (previousWearer !== null && previousWearer !== registrationId) {
    const [wearer] = await findHofRegistrations(payload, hofId, previousWearer);
    if (wearer !== undefined) throw wristbandError('CONFLICT', 'bandWornByOther');
  }
  return { band, previousWearer };
};

/**
 * Writes a band checked by `checkAssignable` to the registration. Someone who still wears an
 * active band gets no second one.
 *
 * The check before the write cannot see a second phone handing the same person another band at
 * the same moment, so the bands are counted again after it. Of two bands written together the
 * older one stays, by its id, which both requests agree on; the other goes back to whoever wore
 * it before and its request is refused like the check before the write would have.
 */
const writeAssignment = async (
  payload: Payload,
  { hofId, uid, registrationId, userId }: AssignInput,
  { band, previousWearer }: { band: Wristband; previousWearer: string | null },
): Promise<void> => {
  const wearsOtherBand = async (): Promise<boolean> => {
    const activeBandIds = await findActiveBandIds(payload, registrationId);
    return activeBandIds.some((id) => id !== band.id);
  };
  if (await wearsOtherBand()) throw wristbandError('CONFLICT', 'personHasBand');

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
      throw wristbandError('CONFLICT', 'personHasBand');
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
    throw wristbandError('CONFLICT', 'personHasBand');
  }
  logger.info('Handed out a band', { 'wristband.uid': uid, 'wristband.hof': hofId });
};

/** Hands a band of the Hof to one of its registrations, see `checkAssignable`. */
export const assignWristband = async (payload: Payload, input: AssignInput): Promise<void> => {
  const checked = await checkAssignable(payload, input);
  await writeAssignment(payload, input, checked);
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
  if (band.status === 'revoked') throw wristbandError('CONFLICT', 'bandRevoked');
  await payload.update({
    collection: 'wristbands',
    id: band.id,
    data: { participant: null, lastEditedByUser: input.userId },
    overrideAccess: true,
  });
  logger.info('Took a band back', { 'wristband.uid': input.uid, 'wristband.hof': input.hofId });
};

/**
 * Gives a person a new band for one that was lost or broke: their active band is blocked, so a
 * read of it names nobody, and the new one is handed out. The registration stays on the old
 * band, so the admin panel shows whose it was; only admin and web unblock a band again. If the
 * new band cannot be written, the old one is unblocked again, so nobody is left without a band.
 */
export const replaceWristband = async (payload: Payload, input: AssignInput): Promise<void> => {
  const { hofId, registrationId, userId } = input;
  const checked = await checkAssignable(payload, input);

  const activeBandIds = await findActiveBandIds(payload, registrationId);
  const oldBandIds = activeBandIds.filter((id) => id !== checked.band.id);
  const setStatus = async (status: 'active' | 'revoked'): Promise<void> => {
    for (const id of oldBandIds) {
      await payload.update({
        collection: 'wristbands',
        id,
        data: { status, lastEditedByUser: userId },
        overrideAccess: true,
      });
    }
  };

  await setStatus('revoked');
  try {
    await writeAssignment(payload, input, checked);
  } catch (error) {
    await setStatus('active');
    logger.warn('Unblocked the old band again: the new one could not be handed out', {
      'wristband.hof': hofId,
      'wristband.blocked': oldBandIds.length,
    });
    throw error;
  }
  logger.info('Blocked the old band of a person for a new one', {
    'wristband.hof': hofId,
    'wristband.blocked': oldBandIds.length,
  });
};

/** The Cevi.DB id of a registration of the Hof, the one its login shares. */
const personIdOf = async (
  payload: Payload,
  hofId: string,
  registrationId: string,
): Promise<string> => {
  const [registration] = await findHofRegistrations(payload, hofId, registrationId);
  if (registration === undefined) throw wristbandError('NOT_FOUND', 'registrationNotInHof');
  // a registration comes from Cevi.DB with its person; without one nobody could log in as them
  const personId: unknown = registration.userId;
  if (typeof personId !== 'string' || personId === '') {
    throw wristbandError('CONFLICT', 'helperWithoutLogin');
  }
  return personId;
};

/** Lets a person of the Hof hand out its bands at a station, until the AVP takes it back. */
export const addWristbandHelper = async (
  payload: Payload,
  input: { hofId: string; registrationId: string; userId: string },
): Promise<void> => {
  const personId = await personIdOf(payload, input.hofId, input.registrationId);
  const { totalDocs } = await payload.count({
    collection: 'wristband-helpers',
    where: { and: [{ hof: { equals: input.hofId } }, { personId: { equals: personId } }] },
    overrideAccess: true,
  });
  if (totalDocs > 0) return;
  await payload.create({
    collection: 'wristband-helpers',
    data: { hof: input.hofId, personId, addedBy: input.userId },
    overrideAccess: true,
  });
  logger.info('Named a wristband helper', { 'wristband.hof': input.hofId });
};

/** Takes the rights of a helper of the Hof back. */
export const removeWristbandHelper = async (
  payload: Payload,
  input: { hofId: string; registrationId: string },
): Promise<void> => {
  const personId = await personIdOf(payload, input.hofId, input.registrationId);
  await payload.delete({
    collection: 'wristband-helpers',
    where: { and: [{ hof: { equals: input.hofId } }, { personId: { equals: personId } }] },
    overrideAccess: true,
  });
  logger.info('Removed a wristband helper', { 'wristband.hof': input.hofId });
};

/** A band with its wearer, Hof and Quartier filled in. */
type PopulatedBand = Pick<Wristband, 'id' | 'uid' | 'status' | 'participant' | 'hof' | 'rosterKey'>;

const ROSTER_REGISTRATION_FIELDS = { fullName: true, nickname: true } as const;

const findPopulatedBands = async (
  payload: Payload,
  where: Where,
  limit: number,
  /** what of the wearer's registration to read; the band's card needs more than a read */
  registrationFields: Record<string, true> = ROSTER_REGISTRATION_FIELDS,
): Promise<PopulatedBand[]> => {
  const { docs } = await payload.find({
    collection: 'wristbands',
    where,
    depth: 2,
    limit,
    pagination: false,
    overrideAccess: true,
    showHiddenFields: true,
    select: { uid: true, status: true, participant: true, hof: true, rosterKey: true },
    populate: {
      'bill-participants': registrationFields,
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

/** What security and first aid learn about a band found by its UID, or about none. */
const identityOf = (
  uid: string,
  band: PopulatedBand | undefined,
  verified: boolean,
): WristbandIdentity => {
  if (band === undefined) return { state: 'unknown', uid };
  if (band.status === 'revoked') return { state: 'revoked', uid };
  const wearer = toRosterEntry(band);
  if (wearer === null) return { state: 'unassigned', uid, hof: hofNames(band.hof).hof };
  return { state: 'assigned', ...wearer, verified };
};

/**
 * Whose a band is, for security and first aid. With the signature from a tap in the app it is
 * checked against NXP's key; a cold tap opens `/tag/{uid}` with the UID alone, and the answer
 * says it was not checked. A checked read of a band that has no roster key yet stores it, see
 * `rememberBandKey`. Every read is logged at debug, with who read it.
 */
export const identifyWristband = async (
  payload: Payload,
  input: { uid: string; signature: string | null; readerId: string },
): Promise<WristbandIdentity> => {
  const { uid, signature, readerId } = input;
  const verified = signature !== null;
  if (verified && !isGenuineBand(uid, signature)) {
    logger.warn('A band read with an invalid NXP signature', {
      'wristband.uid': uid,
      'wristband.reader': readerId,
    });
    return { state: 'not-genuine', uid };
  }

  const [band] = await findPopulatedBands(payload, { uid: { equals: uid } }, 1);
  if (verified && band !== undefined) await rememberBandKey(payload, band, input);
  logger.debug('Read a band', {
    'wristband.uid': uid,
    'wristband.reader': readerId,
    'wristband.verified': verified,
    'wristband.known': band !== undefined,
  });
  return identityOf(uid, band, verified);
};

/** What the offline list says about a band that is not blocked. */
const sealedContentOf = (band: PopulatedBand): SealedBand => {
  const wearer = toRosterEntry(band);
  if (wearer === null) return { hof: hofNames(band.hof).hof };
  // the UID stays out: the entry is found by its index, and the UID would name the band
  return {
    fullName: wearer.fullName,
    nickname: wearer.nickname,
    hof: wearer.hof,
    quartier: wearer.quartier,
  };
};

/**
 * Every band, kept offline by the phones of security and first aid, so a phone offline answers
 * what `identifyWristband` would. The worn and spare bands are sealed under their keys, see
 * `sealed-roster.ts`: the list names nobody without the band in hand. The blocked ones stay plain
 * UIDs, which name nobody either. A band without a key yet is left out until a read stores it.
 */
export const getSealedWristbandRoster = async (
  payload: Payload,
  readerId: string,
): Promise<SealedWristbandRoster> => {
  const bands = await findPopulatedBands(payload, {}, MAX_BANDS);
  const revokedUids: string[] = [];
  const sealable: { key: string; band: PopulatedBand }[] = [];
  let withoutKey = 0;
  for (const band of bands) {
    if (band.status === 'revoked') revokedUids.push(band.uid);
    else if (typeof band.rosterKey === 'string' && band.rosterKey !== '')
      sealable.push({ key: band.rosterKey, band });
    else withoutKey += 1;
  }
  const entries = await Promise.all(
    sealable.map(async ({ key, band }) => await sealBand(key, sealedContentOf(band))),
  );
  logger.debug('Loaded the wristband roster', {
    'wristband.reader': readerId,
    'wristband.bands': entries.length,
    'wristband.without_key': withoutKey,
  });
  return { entries, revokedUids };
};

/**
 * What security and first aid learn from a band whose signature was not checked: whose it is,
 * but not where to find them. A UID can be guessed, so Hof and Quartier wait for the check.
 */
const withoutHof = (identity: WristbandIdentity): WristbandIdentity => {
  if (identity.state === 'assigned') return { ...identity, hof: '', quartier: null };
  if (identity.state === 'unassigned') return { ...identity, hof: '' };
  return identity;
};

/**
 * What the page of a tapped band shows the user, decided here by role and by whether the band
 * was really held to the phone, so nothing more leaves the server. A UID alone can be guessed:
 * it only names the wearer, by the Ceviname or first name, and for security and first aid also
 * by the full name. With NXP's signature, read by the tap or by a scan on the page, the band
 * leads to a chat with the wearer, and for security and first aid to its Hof and Quartier and
 * the Hof's AVP. A signature that does not match makes it a copy, which names nobody.
 *
 * `signature` is undefined when the page has none; null when a scan read none, which only the
 * test switch lets through, see `isGenuineBand`. Every read is logged at debug.
 */
export const getWristbandCard = async (
  payload: Payload,
  input: { uid: string; signature?: string | null | undefined; userId: string; reader: boolean },
): Promise<WristbandCard> => {
  const { uid, signature, userId, reader } = input;
  if (typeof signature === 'string' && !isGenuineBand(uid, signature)) {
    logger.warn('Opened the page of a band with an invalid NXP signature', {
      'wristband.uid': uid,
      'user.id': userId,
    });
    return {
      verified: false,
      wearer: { state: 'not-genuine' },
      safety: reader ? { identity: { state: 'not-genuine', uid }, avps: null } : null,
    };
  }
  const verified = signature !== undefined && isGenuineBand(uid, signature);

  const [populated] = await findPopulatedBands(
    payload,
    { uid: { equals: uid } },
    1,
    BAND_REGISTRATION_FIELDS,
  );
  const band = toBandWearer(populated);
  const { registration } = band;
  const [wearerUserId, administrators] = await Promise.all([
    registration === null ? undefined : findAppUserOfPerson(payload, registration.ceviPersonId),
    reader && verified && band.hofId !== null ? findHofAdministrators(payload, band.hofId) : null,
  ]);
  logger.debug('Opened the page of a band', {
    'wristband.uid': uid,
    'user.id': userId,
    'wristband.reader': reader,
    'wristband.verified': verified,
    'wristband.known': band.band !== 'unknown',
  });

  let wearer: WristbandCard['wearer'];
  if (registration === null) wearer = { state: 'none' };
  else if (wearerUserId === userId) wearer = { state: 'own' };
  else
    wearer = {
      state: 'worn',
      name: shortNameOf(registration),
      canChat: wearerUserId !== undefined,
    };

  if (!reader) return { verified, wearer, safety: null };
  const identity = identityOf(uid, populated, verified);
  if (!verified)
    return { verified, wearer, safety: { identity: withoutHof(identity), avps: null } };
  const avps = administrators?.filter((avp) => avp.userId !== userId) ?? null;
  return { verified, wearer, safety: { identity, avps } };
};
