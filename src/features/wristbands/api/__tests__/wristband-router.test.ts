import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

/*
An in-memory Payload that knows just the queries the wristbands ask: `equals`, `not_equals`,
`in` and `and`, `sort` and `limit` as Payload applies them, and `depth` filling in a band's
registration, Hof and Quartier.
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
    // `groups.id`: any entry of the array field
    const [name = field, key] = field.split('.');
    const values =
      key === undefined
        ? [document[name] ?? null]
        : ((document[name] as Record<string, unknown>[] | undefined) ?? []).map(
            (entry) => entry[key] ?? null,
          );
    return Object.entries(condition).every(([operator, expected]) =>
      values.some((value) => {
        if (operator === 'equals') return value === expected;
        if (operator === 'not_equals') return value !== expected;
        if (operator === 'in') return (expected as unknown[]).includes(value);
        if (operator === 'contains') return Array.isArray(value) && value.includes(expected);
        throw new Error(`the fake does not know ${operator}`);
      }),
    );
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
    ({
      collection,
      where,
      depth,
      sort,
      limit,
    }: {
      collection: string;
      where?: Condition;
      depth?: number;
      sort?: string;
      limit?: number;
    }) => {
      let found = (mockStore[collection] ?? []).filter((document) => matches(document, where));
      if (sort !== undefined) {
        const key = (document: Document_): string => {
          const value = document[sort];
          return typeof value === 'string' ? value : '';
        };
        found = found.toSorted((a, b) => key(a).localeCompare(key(b)));
      }
      if (limit !== undefined && limit > 0) found = found.slice(0, limit);
      return Promise.resolve({
        docs: (depth ?? 0) >= 1 ? found.map((d) => populate(d)) : found,
      });
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
  delete: jest.fn(({ collection, where }: { collection: string; where?: Condition }) => {
    const kept = (mockStore[collection] ?? []).filter((document) => !matches(document, where));
    mockStore[collection] = kept;
    return Promise.resolve({ docs: [] });
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
jest.mock('@/lib/db/redis', () => ({
  // every rate limit counter at its first call
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
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
const SPARE_BAND = '04AABBCCDDEEFF';
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
/** Tim Huber, a leader of Cevi Uster, logged in; a helper once the AVP names him. */
const tim = callerAs('user-tim');

/** Blocks a band the way admin and web do in the admin panel. */
const block = (uid: string): void => {
  const band = mockStore['wristbands']?.find((document) => document['uid'] === uid);
  if (band === undefined) throw new Error(`no band ${uid}`);
  band['status'] = 'revoked';
};

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
        firstName: 'Lea',
        nickname: 'Fuchs',
        userId: '5001',
        eventId: '7001',
        eventName: 'Hauptlager conveniat27 - Cevi Uster',
        roleType: 'Event::Camp::Role::Participant',
        active: true,
        status: 'new',
      },
      {
        id: 'reg-tim',
        fullName: 'Tim Huber',
        firstName: 'Tim',
        nickname: null,
        userId: '5002',
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

  it('lets any Hof program a band again once a full admin deleted it, also a blocked one', async () => {
    const first = await program(usterAvp);
    block(BAND);
    // what the admin panel does on delete
    mockStore['wristbands'] = [];

    await expect(program(zueriAvp, BAND, GOOD_SIGNATURE, 'zueri')).resolves.toEqual(first);
    expect(mockStore['wristbands']).toEqual([
      expect.objectContaining({
        uid: BAND,
        hof: 'zueri',
        status: 'active',
        programmedBy: 'avp-zueri',
      }),
    ]);
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
    block(OTHER_BAND);
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
    await expect(usterAvp.getMyHofList()).resolves.toEqual([
      { id: 'uster', name: 'Cevi Uster', role: 'avp' },
    ]);
    await expect(fullAdmin.getMyHofList()).resolves.toEqual([
      { id: 'uster', name: 'Cevi Uster', role: 'avp' },
      { id: 'zueri', name: 'Züri 11', role: 'avp' },
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
        expect.objectContaining({ registrationId: 'reg-mia', fullName: 'Mia Brunner', band: null }),
        expect.objectContaining({ registrationId: 'reg-tim', fullName: 'Tim Huber', band: null }),
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
      // a registration without a role is no leader by a gap in the data
      { registrationId: 'reg-mia', abteilung: 'Cevi Wetzikon', role: 'participant' },
      { registrationId: 'reg-tim', abteilung: 'Cevi Uster', role: 'leader' },
    ]);
  });

  it('takes a band just given back, for the undo right after', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.unassignWristband({ hofId: 'uster', uid: BAND });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: null });
  });

  it('never takes a band from someone of the Hof who wears it, also for a station that did not know', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await expect(
      usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-tim' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', reason: 'bandWornByOther' });
    await expect(
      usterAvp.replaceWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-tim' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', reason: 'bandWornByOther' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-lea' });
  });

  it('gives the band of someone whose registration ended to the next person', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    const lea = byId('bill-participants', 'reg-lea');
    if (lea !== undefined) lea['status'] = 'removed';
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-tim' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-tim' });
  });

  it('unblocks the old band again when the new one cannot be handed out', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    // the old band is blocked, then writing the new one fails
    const update = mockPayload.update.getMockImplementation();
    mockPayload.update
      .mockImplementationOnce((arguments_) => {
        if (update === undefined) throw new Error('no update');
        return update(arguments_);
      })
      .mockImplementationOnce(() => Promise.reject(new Error('write failed')));
    await expect(
      usterAvp.replaceWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' }),
    ).rejects.toThrow('write failed');
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({
      status: 'active',
      participant: 'reg-lea',
    });
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
    block(BAND);
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

  it('gives a new band for a lost one and blocks the lost one, which keeps whose it was', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.replaceWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({
      status: 'revoked',
      participant: 'reg-lea',
    });
    expect(byId('wristbands', 'wristbands-2')).toMatchObject({
      status: 'active',
      participant: 'reg-lea',
    });
  });

  it('does not give a blocked band as the new one', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    block(OTHER_BAND);
    await expect(
      usterAvp.replaceWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', reason: 'bandRevoked' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ status: 'active' });
  });

  it("refuses people who are not registered at the Hof's camp", async () => {
    for (const registrationId of ['reg-zueri', 'reg-gone']) {
      await expect(
        usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    }
  });
});

describe('the Hauptleitung of a Hof camp', () => {
  it('hands out the bands of the Hof like its address administrator, and names its helpers', async () => {
    mockStore['users']?.push({ id: 'lead-uster', groups: [], avpHoefe: ['uster'] });
    const lead = callerAs('lead-uster');
    await expect(lead.getMyHofList()).resolves.toEqual([
      { id: 'uster', name: 'Cevi Uster', role: 'avp' },
    ]);
    await expect(program(lead)).resolves.toMatchObject({ ok: true });
  });
});

describe('helpers at the stations', () => {
  beforeEach(async () => {
    mockStore['users']?.push({ id: 'user-tim', groups: [], cevi_db_uuid: 5002 });
    await program(usterAvp);
  });

  it('lets a person the AVP named hand out the bands of that Hof, and nothing else', async () => {
    await expect(tim.getMyHofList()).resolves.toEqual([]);
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });

    await expect(tim.getMyHofList()).resolves.toEqual([
      { id: 'uster', name: 'Cevi Uster', role: 'helper' },
    ]);
    await expect(tim.getWristbandAccess()).resolves.toEqual({ hoefe: 1, reader: false });
    await tim.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-lea' });
    await expect(tim.getHofWristbandList({ hofId: 'zueri' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('shows the AVP who helps, and names a helper only once', async () => {
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    expect(mockStore['wristband-helpers']).toHaveLength(1);
    const { people } = await usterAvp.getHofWristbandList({ hofId: 'uster' });
    expect(people.filter((person) => person.helper).map((person) => person.registrationId)).toEqual(
      ['reg-tim'],
    );
  });

  it('takes the rights back when the AVP removes the helper', async () => {
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    await usterAvp.removeWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    await expect(tim.getMyHofList()).resolves.toEqual([]);
    await expect(
      tim.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('leaves naming helpers to the AVP of the Hof', async () => {
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    await expect(
      tim.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', reason: 'notHofAvp' });
    await expect(
      zueriAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockStore['wristband-helpers']).toHaveLength(1);
  });

  it('ends the rights of a helper whose registration at the Hof ended', async () => {
    await usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-tim' });
    const timsRegistration = byId('bill-participants', 'reg-tim');
    if (timsRegistration !== undefined) timsRegistration['status'] = 'removed';
    await expect(tim.getMyHofList()).resolves.toEqual([]);
    await expect(
      tim.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', reason: 'notYourHof' });
  });

  it('names only people of the Hof who can log in', async () => {
    await expect(
      usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-zueri' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', reason: 'registrationNotInHof' });
    await expect(
      usterAvp.addWristbandHelper({ hofId: 'uster', registrationId: 'reg-mia' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', reason: 'helperWithoutLogin' });
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

    block(BAND);
    await expect(
      sanitaet.identifyWristband({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({ state: 'revoked', uid: BAND });
  });

  it('keeps every band in the offline list: worn, spare and blocked', async () => {
    await program(usterAvp, OTHER_BAND);
    block(OTHER_BAND);
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

describe('the page a tapped band opens', () => {
  beforeEach(async () => {
    Object.assign(mockStore['users']?.[0] ?? {}, { fullName: 'Andrea Keller', nickname: 'Luchs' });
    mockStore['users']?.push({ id: 'lea-user', cevi_db_uuid: 5001, fullName: 'Lea Meier' });
    await program(usterAvp);
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await program(usterAvp, OTHER_BAND);
    await usterAvp.assignWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-tim' });
  });

  it('shows a participant only the Ceviname of a band known by its UID alone', async () => {
    await expect(participant.getWristbandCard({ uid: BAND })).resolves.toEqual({
      verified: false,
      wearer: { state: 'worn', name: 'Fuchs', canChat: true },
      safety: null,
    });
  });

  it('verifies the card of a participant who holds the band with its signature', async () => {
    await expect(
      participant.getWristbandCard({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      verified: true,
      wearer: { state: 'worn', name: 'Fuchs', canChat: true },
      safety: null,
    });
  });

  it('shows the first name of someone without a Ceviname, without a chat if they have no app', async () => {
    await expect(
      participant.getWristbandCard({ uid: OTHER_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      verified: true,
      wearer: { state: 'worn', name: 'Tim', canChat: false },
      safety: null,
    });
  });

  it('names nobody, for anyone, on a band whose signature does not match', async () => {
    await expect(
      participant.getWristbandCard({ uid: BAND, signature: FORGED_SIGNATURE }),
    ).resolves.toEqual({ verified: false, wearer: { state: 'not-genuine' }, safety: null });
    await expect(
      sanitaet.getWristbandCard({ uid: BAND, signature: FORGED_SIGNATURE }),
    ).resolves.toEqual({
      verified: false,
      wearer: { state: 'not-genuine' },
      safety: { identity: { state: 'not-genuine', uid: BAND }, avps: null },
    });
  });

  it('leaves a scan that read no signature unverified, unless test stickers are let in', async () => {
    await expect(
      participant.getWristbandCard({ uid: BAND, signature: null }),
    ).resolves.toMatchObject({ verified: false });
    environmentVariables.NFC_ALLOW_UNSIGNED_TAGS = true;
    await expect(
      participant.getWristbandCard({ uid: BAND, signature: null }),
    ).resolves.toMatchObject({ verified: true });
    // a cold tap is no scan, also on a deployment that lets test stickers in
    await expect(participant.getWristbandCard({ uid: BAND })).resolves.toMatchObject({
      verified: false,
    });
  });

  it('tells the wearer it is their own band', async () => {
    await expect(callerAs('lea-user').getWristbandCard({ uid: BAND })).resolves.toMatchObject({
      wearer: { state: 'own' },
    });
  });

  it('names nobody on a blocked band, a spare one or one nobody knows', async () => {
    await program(usterAvp, SPARE_BAND);
    block(BAND);
    for (const uid of [BAND, SPARE_BAND, '04FFFFFFFFFFFF']) {
      await expect(
        participant.getWristbandCard({ uid, signature: GOOD_SIGNATURE }),
      ).resolves.toEqual({ verified: true, wearer: { state: 'none' }, safety: null });
    }
  });

  it('shows the safety team the full name of a band known by its UID, but not where to find them', async () => {
    await expect(sanitaet.getWristbandCard({ uid: BAND })).resolves.toEqual({
      verified: false,
      wearer: { state: 'worn', name: 'Fuchs', canChat: true },
      safety: {
        identity: {
          state: 'assigned',
          uid: BAND,
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          hof: '',
          quartier: null,
          verified: false,
        },
        avps: null,
      },
    });
  });

  it('keeps the Hof of a spare band from the safety team until it is verified', async () => {
    await program(usterAvp, SPARE_BAND);
    await expect(sanitaet.getWristbandCard({ uid: SPARE_BAND })).resolves.toMatchObject({
      safety: { identity: { state: 'unassigned', hof: '' }, avps: null },
    });
    await expect(
      sanitaet.getWristbandCard({ uid: SPARE_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toMatchObject({
      safety: {
        identity: { state: 'unassigned', hof: 'Cevi Uster' },
        avps: [{ userId: 'avp-uster' }],
      },
    });
  });

  it('shows the safety team the Hof, the Quartier and the Hof’s AVP of a verified band', async () => {
    await expect(
      sanitaet.getWristbandCard({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      verified: true,
      wearer: { state: 'worn', name: 'Fuchs', canChat: true },
      safety: {
        identity: {
          state: 'assigned',
          uid: BAND,
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          hof: 'Cevi Uster',
          quartier: 'Quartier 5 - Greif',
          verified: true,
        },
        avps: [{ userId: 'avp-uster', fullName: 'Andrea Keller', nickname: 'Luchs' }],
      },
    });
  });

  it('names the Hauptleitung of the Hof camp among its AVP', async () => {
    mockStore['users']?.push({
      id: 'lead-uster',
      fullName: 'Benno Graf',
      nickname: 'Dachs',
      groups: [],
      avpHoefe: ['uster'],
    });
    const card = await sanitaet.getWristbandCard({ uid: BAND, signature: GOOD_SIGNATURE });
    expect(card.safety?.avps?.map((avp) => avp.userId).toSorted()).toEqual([
      'avp-uster',
      'lead-uster',
    ]);
  });

  it('finds the AVP of a Hof with many members, whatever their name', async () => {
    for (let index = 0; index < 60; index++) {
      mockStore['users']?.push({
        id: `member-${index}`,
        fullName: `Aaron Member ${index}`,
        groups: [{ id: 990_001, role_class: 'Group::MitgliederorganisationExterne::Externer' }],
      });
    }
    await expect(
      sanitaet.getWristbandCard({ uid: BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toMatchObject({
      safety: { avps: [{ userId: 'avp-uster' }] },
    });
  });

  it('reads no band for someone who is not signed in', async () => {
    const guest = createCaller({ prisma: {}, locale: 'de' } as unknown as Context);
    await expect(guest.getWristbandCard({ uid: BAND })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('is not there while the wristbands are off', async () => {
    environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS = false;
    await expect(participant.getWristbandCard({ uid: BAND })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
