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
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [],
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
        events: [{ eventId: '7001' }],
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
        active: true,
        status: 'new',
      },
      {
        id: 'reg-tim',
        fullName: 'Tim Huber',
        nickname: null,
        eventId: '7001',
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
        {
          registrationId: 'reg-lea',
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          band: { uid: BAND, status: 'active' },
        },
        { registrationId: 'reg-tim', fullName: 'Tim Huber', nickname: null, band: null },
      ],
      spareBands: [{ uid: OTHER_BAND, status: 'active' }],
    });
  });

  it('moves a band to someone else of the Hof, and takes it back', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-tim' });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: 'reg-tim' });

    await usterAvp.unassignWristband({ hofId: 'uster', uid: BAND });
    expect(byId('wristbands', 'wristbands-1')).toMatchObject({ participant: null });
  });

  it('gives nobody a second active band', async () => {
    await usterAvp.assignWristband({ hofId: 'uster', uid: BAND, registrationId: 'reg-lea' });
    await expect(
      usterAvp.assignWristband({ hofId: 'uster', uid: OTHER_BAND, registrationId: 'reg-lea' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'person_has_band' });
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

  it('keeps every worn band and every blocked one in the offline list', async () => {
    await program(usterAvp, OTHER_BAND);
    await usterAvp.revokeWristband({ hofId: 'uster', uid: OTHER_BAND });
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
