import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

/*
An in-memory Payload that knows just the queries the wristbands ask: `equals`, `not_equals`,
`in` and `and`, and `depth` filling in a band's registration, Hof and Quartier.
*/
type Document_ = Record<string, unknown> & { id: string };
type Condition = Record<string, Record<string, unknown>> & { and?: Condition[] };

const mockStore: Record<string, Document_[]> = {};

const matches = (document: Document_, where: Condition | undefined): boolean => {
  if (where === undefined) return true;
  return Object.entries(where).every(([field, condition]) => {
    if (field === 'and')
      return (condition as unknown as Condition[]).every((c) => matches(document, c));
    if (field === 'or')
      return (condition as unknown as Condition[]).some((c) => matches(document, c));
    const value = document[field] ?? null;
    return Object.entries(condition).every(([operator, expected]) => {
      if (operator === 'equals') return value === expected;
      if (operator === 'not_equals') return value !== expected;
      if (operator === 'in') return (expected as unknown[]).includes(value);
      throw new Error(`the fake does not know ${operator}`);
    });
  });
};

const byId = (collection: string, id: unknown): Document_ | undefined =>
  mockStore[collection]?.find((document) => document.id === id);

const populate = (band: Document_): Document_ => {
  const hof = byId('hoefe', band['hof']);
  return {
    ...band,
    participant: byId('bill-participants', band['participant']) ?? band['participant'] ?? null,
    hof:
      hof === undefined
        ? band['hof']
        : { ...hof, quartier: byId('quartiere', hof['quartier']) ?? null },
  };
};

let mockNextId = 0;
const mockPayload = {
  find: jest.fn(
    ({ collection, where, depth }: { collection: string; where?: Condition; depth?: number }) => {
      const found = (mockStore[collection] ?? []).filter((document) => matches(document, where));
      return Promise.resolve({ docs: depth === 2 ? found.map((d) => populate(d)) : found });
    },
  ),
  findByID: jest.fn(({ collection, id }: { collection: string; id: string }) =>
    Promise.resolve(byId(collection, id) ?? null),
  ),
  count: jest.fn(({ collection, where }: { collection: string; where?: Condition }) =>
    Promise.resolve({
      totalDocs: (mockStore[collection] ?? []).filter((d) => matches(d, where)).length,
    }),
  ),
  create: jest.fn(({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
    // the UID of a band is unique, as in the collection
    if (
      collection === 'wristbands' &&
      mockStore[collection]?.some((d) => d['uid'] === data['uid'])
    ) {
      return Promise.reject(new Error('E11000 duplicate key error'));
    }
    const document = { id: `${collection}-${++mockNextId}`, ...data };
    (mockStore[collection] ??= []).push(document);
    return Promise.resolve(document);
  }),
  update: jest.fn(
    ({
      collection,
      id,
      data,
    }: {
      collection: string;
      id: string;
      data: Record<string, unknown>;
    }) => {
      const document = byId(collection, id);
      if (document === undefined) throw new Error('not found');
      Object.assign(document, data);
      return Promise.resolve(document);
    },
  ),
};

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_NFC_WRISTBANDS: true,
    NFC_TAG_SECRET: 'a-test-secret-that-is-long-enough-for-the-schema',
    NFC_ALLOW_UNSIGNED_TAGS: false,
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [542],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [4087],
    CEVIDB_GROUP_SAFETY_TEAM: [110],
  },
}));
// the signature check has tests of its own; here a band is genuine when its signature says so
jest.mock('@/lib/nfc/ntag-signature', () => ({
  verifyNtagSignature: (_uid: string, signature: string): boolean => signature === GOOD_SIGNATURE,
}));
// see admin-router-access.test.ts: a direct caller never serializes anything
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { deriveTagCredentials } from '@/features/wristbands/api/tag-password';
import { wristbandRouter } from '@/features/wristbands/api/wristband-router';

const GOOD_SIGNATURE = 'AB'.repeat(32);
const FORGED_SIGNATURE = 'CD'.repeat(32);
const BAND = '04A1B2C3D4E5F6';
const OTHER_BAND = '04112233445566';
const ADDRESS_ADMINISTRATOR = 'Group::MitgliederorganisationExterne::Adressverwalter';

const createCaller = createCallerFactory(wristbandRouter);
const { environmentVariables } = jest.requireMock<{
  environmentVariables: {
    NFC_ALLOW_UNSIGNED_TAGS: boolean;
    FEATURE_ENABLE_NFC_WRISTBANDS: boolean;
  };
}>('@/config/environment-variables');

const callerAs = (uuid: string, groupIds: number[] = []): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: groupIds },
    prisma: {},
    locale: 'de',
  } as unknown as Context);

/** The AVP of Cevi Uster, address administrator of its Cevi.DB group. */
const usterAvp = callerAs('avp-uster');
const zueriAvp = callerAs('avp-zueri');
const sanitaet = callerAs('sani-1', [110]);
const participant = callerAs('kid-1');
/** A member of the Ressort Infrastruktur, who reviews every Hof's dashboard. */
const reviewer = callerAs('ressort-1', [4087]);
const webCoreTeam = callerAs('web-1', [542]);
const fullAdmin = callerAs('admin-1', [541]);

beforeEach(() => {
  mockNextId = 0;
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  Object.assign(mockStore, {
    users: [
      { id: 'avp-uster', groups: [{ id: 990_001, role_class: ADDRESS_ADMINISTRATOR }] },
      { id: 'avp-zueri', groups: [{ id: 990_002, role_class: ADDRESS_ADMINISTRATOR }] },
    ],
    quartiere: [{ id: 'q5', name: 'Quartier 5 - Greif' }],
    hoefe: [
      {
        id: 'uster',
        name: 'Cevi Uster',
        groupId: '990001',
        quartier: 'q5',
        events: [{ eventId: '7001' }, { eventId: '7003' }],
      },
      {
        id: 'zueri',
        name: 'Züri 11',
        groupId: '990002',
        quartier: null,
        events: [{ eventId: '7002' }],
      },
    ],
    'bill-participants': [
      {
        id: 'reg-lea',
        fullName: 'Lea Meier',
        nickname: 'Fuchs',
        eventId: '7001',
        eventName: 'Hauptlager conveniat27 - Cevi Uster',
        roleType: 'Event::Camp::Role::Participant',
        active: true,
        status: 'new',
      },
      {
        id: 'reg-tim',
        fullName: 'Tim Huber',
        nickname: null,
        eventId: '7001',
        eventName: 'Hauptlager conveniat27 - Cevi Uster',
        roleType: 'Event::Camp::Role::AssistantLeader',
        active: true,
        status: 'new',
      },
      {
        id: 'reg-mia',
        fullName: 'Mia Brunner',
        nickname: 'Wiesel',
        eventId: '7003',
        eventName: 'Hauptlager conveniat27 - Cevi Wetzikon',
        roleType: null,
        active: true,
        status: 'new',
      },
      {
        id: 'reg-gone',
        fullName: 'Max Abgemeldet',
        nickname: null,
        eventId: '7001',
        active: true,
        status: 'removed',
      },
      {
        id: 'reg-zueri',
        fullName: 'Nina Keller',
        nickname: null,
        eventId: '7002',
        active: true,
        status: 'new',
      },
    ],
    wristbands: [],
  });
  environmentVariables.NFC_ALLOW_UNSIGNED_TAGS = false;
  environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS = true;
});

const program = async (
  caller: ReturnType<typeof createCaller>,
  uid = BAND,
  signature: string | null = GOOD_SIGNATURE,
  hofId = 'uster',
): Promise<unknown> => {
  // what the app does: the password while the band lies on the phone, the record once written
  const answer = await caller.programWristband({ hofId, uid, signature });
  if (answer.ok) await caller.registerWristband({ hofId, uid, signature });
  return answer;
};

describe('programming a band', () => {
  it('hands the AVP the password derived from the UID and records the band for the Hof', async () => {
    await expect(program(usterAvp)).resolves.toEqual({
      ok: true,
      ...deriveTagCredentials(BAND, 'a-test-secret-that-is-long-enough-for-the-schema'),
    });
    expect(mockStore['wristbands']).toEqual([
      expect.objectContaining({
        uid: BAND,
        hof: 'uster',
        status: 'active',
        programmedBy: 'avp-uster',
      }),
    ]);
  });

  it('records nothing until the phone reports the band written', async () => {
    await usterAvp.programWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE });
    expect(mockStore['wristbands']).toEqual([]);
  });

  it('refuses to record a band another Hof recorded in the meantime', async () => {
    await usterAvp.programWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE });
    await program(zueriAvp, BAND, GOOD_SIGNATURE, 'zueri');
    await expect(
      usterAvp.registerWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({ ok: false, reason: 'assigned-to-other' });
  });

  it('gives the same password again for a band programmed before, without a second entry', async () => {
    const first = await program(usterAvp);
    await expect(program(usterAvp)).resolves.toEqual(first);
    expect(mockStore['wristbands']).toHaveLength(1);
  });

  it('refuses a chip without a valid NXP signature, before writing anything', async () => {
    await expect(program(usterAvp, BAND, null)).resolves.toEqual({
      ok: false,
      reason: 'not-genuine',
    });
    await expect(program(usterAvp, BAND, FORGED_SIGNATURE)).resolves.toEqual({
      ok: false,
      reason: 'not-genuine',
    });
    expect(mockStore['wristbands']).toEqual([]);
  });

  it('lets test stickers without a signature through where the deployment allows them', async () => {
    environmentVariables.NFC_ALLOW_UNSIGNED_TAGS = true;
    await expect(program(usterAvp, BAND, null)).resolves.toMatchObject({ ok: true });
  });

  it('refuses a band another Hof programmed, and a blocked one', async () => {
    await program(zueriAvp, BAND, GOOD_SIGNATURE, 'zueri');
    await expect(program(usterAvp)).resolves.toEqual({ ok: false, reason: 'assigned-to-other' });

    await program(usterAvp, OTHER_BAND);
    await usterAvp.revokeWristband({ hofId: 'uster', uid: OTHER_BAND });
    await expect(program(usterAvp, OTHER_BAND)).resolves.toEqual({ ok: false, reason: 'revoked' });
  });

  it("keeps an AVP away from another Hof's bands", async () => {
    await expect(program(usterAvp, BAND, GOOD_SIGNATURE, 'zueri')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(usterAvp.getHofWristbandList({ hofId: 'zueri' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it("keeps the Hof dashboard reviewers and the web core team away from every Hof's bands", async () => {
    for (const caller of [reviewer, webCoreTeam]) {
      await expect(caller.getMyHofList()).resolves.toEqual([]);
      await expect(program(caller)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.getHofWristbandList({ hofId: 'uster' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    }
  });

  it('lets the AVP at the bands of their own Hof and a full admin at those of every Hof', async () => {
    await expect(usterAvp.getMyHofList()).resolves.toEqual([{ id: 'uster', name: 'Cevi Uster' }]);
    await expect(fullAdmin.getMyHofList()).resolves.toEqual([
      { id: 'uster', name: 'Cevi Uster' },
      { id: 'zueri', name: 'Züri 11' },
    ]);
    await expect(program(fullAdmin, OTHER_BAND, GOOD_SIGNATURE, 'zueri')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('records a band reported by two phones at once a single time, for both', async () => {
    await usterAvp.programWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE });
    const register = (): Promise<unknown> =>
      usterAvp.registerWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE });
    await expect(Promise.all([register(), register()])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(mockStore['wristbands']).toHaveLength(1);
  });

  it('refuses a band another Hof recorded at the same moment', async () => {
    const [uster, zueri] = await Promise.all([
      usterAvp.registerWristband({ hofId: 'uster', uid: BAND, signature: GOOD_SIGNATURE }),
      zueriAvp.registerWristband({ hofId: 'zueri', uid: BAND, signature: GOOD_SIGNATURE }),
    ]);
    expect([uster, zueri]).toContainEqual({ ok: false, reason: 'assigned-to-other' });
    expect([uster, zueri]).toContainEqual({ ok: true });
    expect(mockStore['wristbands']).toHaveLength(1);
  });

  it('is not there while the wristbands are off', async () => {
    environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS = false;
    await expect(program(usterAvp)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('handing out a band', () => {
  beforeEach(async () => {
    await program(usterAvp);
    await program(usterAvp, OTHER_BAND);
  });

  it("lists the Hof's registrations with their bands, and the bands not handed out", async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await expect(usterAvp.getHofWristbandList({ hofId: 'uster' })).resolves.toEqual({
      people: [
        expect.objectContaining({
          registrationId: 'reg-lea',
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          band: { uid: BAND, status: 'active' },
        }),
        expect.objectContaining({ registrationId: 'reg-tim', fullName: 'Tim Huber', band: null }),
        expect.objectContaining({ registrationId: 'reg-mia', fullName: 'Mia Brunner', band: null }),
      ],
      spareBands: [{ uid: OTHER_BAND, status: 'active' }],
    });
  });

  it('says for every person their Abteilung and whether they come to lead', async () => {
    const { people } = await usterAvp.getHofWristbandList({ hofId: 'uster' });
    expect(
      people.map(({ registrationId, abteilung, role }) => ({ registrationId, abteilung, role })),
    ).toEqual([
      { registrationId: 'reg-lea', abteilung: 'Cevi Uster', role: 'participant' },
      { registrationId: 'reg-tim', abteilung: 'Cevi Uster', role: 'leader' },
      // a registration without a role is no leader by a gap in the data
      { registrationId: 'reg-mia', abteilung: 'Cevi Wetzikon', role: 'participant' },
    ]);
  });

  it('moves a band to someone else of the Hof, and takes it back', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-tim' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-tim' });

    await usterAvp.unassignWristband({ hofId: 'uster', uid: BAND });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: null });
  });

  it('gives nobody a second active band, also from two phones at the same moment', async () => {
    const results = await Promise.allSettled([
      usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' }),
      usterAvp.assignWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' }),
    ]);
    expect(results.map((result) => result.status).toSorted()).toEqual(['fulfilled', 'rejected']);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'CONFLICT', reason: 'personHasBand' },
    });
    expect(
      mockStore['wristbands']?.filter((band) => band['participant'] === 'reg-lea'),
    ).toHaveLength(1);
  });

  it('does not take a blocked band back, so it keeps whose it was', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.revokeWristband({ hofId: 'uster', uid: BAND });
    await expect(usterAvp.unassignWristband({ hofId: 'uster', uid: BAND })).rejects.toMatchObject({
      code: 'CONFLICT',
      reason: 'bandRevoked',
    });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-lea' });
  });

  it('gives nobody a second active band', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await expect(
      usterAvp.assignWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', reason: 'personHasBand' });
  });

  it('hands a replacement once the lost band is blocked', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.revokeWristband({ hofId: 'uster', uid: BAND });
    await usterAvp.assignWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' });
    expect(byId('wristbands', 'wristbands-2')).toMatchObject({ participant: 'reg-lea' });
  });

  it("refuses people who are not registered at the Hof's camp", async () => {
    for (const registrationId of ['reg-zueri', 'reg-gone']) {
      await expect(
        usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    }
  });
});

describe('reading a band', () => {
  beforeEach(async () => {
    await program(usterAvp);
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
  });

  it('names the wearer, the Hof and the Quartier for security and first aid', async () => {
    await expect(
      sanitaet.identifyWristband({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      state: 'assigned',
      uid: BAND,
      fullName: 'Lea Meier',
      nickname: 'Fuchs',
      hof: 'Cevi Uster',
      quartier: 'Quartier 5 - Greif',
      verified: true,
    });
  });

  it('says a cold tap without a signature was not checked', async () => {
    await expect(sanitaet.identifyWristband({ uid: BAND, signature: null })).resolves.toMatchObject(
      {
        state: 'assigned',
        verified: false,
      },
    );
  });

  it('names nobody for a copy, a blocked band or a band nobody knows', async () => {
    await expect(
      sanitaet.identifyWristband({ uid: BAND, signature: FORGED_SIGNATURE }),
    ).resolves.toEqual({ state: 'not-genuine', uid: BAND });
    await expect(
      sanitaet.identifyWristband({ uid: OTHER_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({ state: 'unknown', uid: OTHER_BAND });

    await usterAvp.revokeWristband({ hofId: 'uster', uid: BAND });
    await expect(
      sanitaet.identifyWristband({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({ state: 'revoked', uid: BAND });
  });

  it('keeps every band in the offline list: worn, spare and blocked', async () => {
    const SPARE_BAND = '04998877665544';
    await program(usterAvp, OTHER_BAND);
    await usterAvp.revokeWristband({ hofId: 'uster', uid: OTHER_BAND });
    await program(usterAvp, SPARE_BAND);
    await expect(sanitaet.getWristbandRoster()).resolves.toEqual({
      bands: [
        {
          uid: BAND,
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          hof: 'Cevi Uster',
          quartier: 'Quartier 5 - Greif',
        },
      ],
      spareBands: [{ uid: SPARE_BAND, hof: 'Cevi Uster' }],
      revokedUids: [OTHER_BAND],
    });
  });

  it('is closed to participants and to the AVP', async () => {
    for (const caller of [participant, usterAvp]) {
      await expect(
        caller.identifyWristband({ uid: BAND, signature: GOOD_SIGNATURE }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.getWristbandRoster()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  });
});

describe('what the app shows whom', () => {
  it('counts the Höfe of an AVP, who reads no band', async () => {
    await expect(usterAvp.getWristbandAccess()).resolves.toEqual({ hoefe: 1, reader: false });
  });

  it('lets security and first aid read, without a Hof of their own', async () => {
    await expect(sanitaet.getWristbandAccess()).resolves.toEqual({ hoefe: 0, reader: true });
  });

  it('counts no Hof for a Hof dashboard reviewer, and every Hof for a full admin', async () => {
    await expect(reviewer.getWristbandAccess()).resolves.toEqual({ hoefe: 0, reader: false });
    await expect(fullAdmin.getWristbandAccess()).resolves.toEqual({ hoefe: 2, reader: true });
  });

  it('shows a participant neither page', async () => {
    await expect(participant.getWristbandAccess()).resolves.toEqual({ hoefe: 0, reader: false });
  });

  it('is not there while the wristbands are off', async () => {
    environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS = false;
    await expect(sanitaet.getWristbandAccess()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
