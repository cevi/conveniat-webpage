import type { BandWearer } from '@/features/payload-cms/payload-cms/utils/wristband-people';
import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve({}) }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_NFC_WRISTBANDS: true },
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/lib/db/redis', () => ({
  // every rate limit counter at its first call
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
// the signature check has tests of its own; here a band is genuine when its signature says so
jest.mock('@/lib/nfc/ntag-signature', () => ({
  verifyNtagSignature: (_uid: string, signature: string): boolean => signature === GOOD_SIGNATURE,
}));
// the safety team is Cevi.DB group 110 here
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  ...jest.requireActual<object>('@/features/payload-cms/payload-cms/access-rules/roles'),
  hasAccessToThisUser: ({ user }: { user: { group_ids: number[] } }): boolean =>
    user.group_ids.includes(110),
}));

const GOOD_SIGNATURE = 'AB'.repeat(32);
const FORGED_SIGNATURE = 'CD'.repeat(32);
const LEA_BAND = '04A1B2C3D4E5F6';
const TIM_BAND = '04112233445566';
const SPARE_BAND = '04AABBCCDDEEFF';

/** The bands as Payload knows them: Lea and Tim of Cevi Uster wear one, one is a spare. */
const bands: Record<string, BandWearer> = {
  [LEA_BAND]: {
    band: 'worn',
    hofId: 'uster',
    registration: {
      fullName: 'Lea Meier',
      firstName: 'Lea',
      nickname: 'Fuchs',
      ceviPersonId: '5001',
    },
  },
  [TIM_BAND]: {
    band: 'worn',
    hofId: 'uster',
    registration: { fullName: 'Tim Huber', firstName: 'Tim', nickname: null, ceviPersonId: '5002' },
  },
  [SPARE_BAND]: { band: 'unassigned', hofId: 'uster', registration: null },
};
/** Lea has the app, Tim never logged in. */
const appUsers: Record<string, string> = { '5001': 'lea' };

jest.mock('@/features/payload-cms/payload-cms/utils/wristband-people', () => ({
  findBandWearer: (_payload: unknown, uid: string): Promise<BandWearer> =>
    Promise.resolve(bands[uid] ?? { band: 'unknown', hofId: null, registration: null }),
  findAppUserOfPerson: (_payload: unknown, personId: string): Promise<string | undefined> =>
    Promise.resolve(appUsers[personId]),
  findHofAdministrators: (): Promise<unknown[]> =>
    Promise.resolve([{ userId: 'avp-uster', fullName: 'Andrea Keller', nickname: 'Luchs' }]),
}));

// Creating the chat is covered elsewhere; here it only matters with whom.
const findOrCreatePrivateChat = jest.fn().mockResolvedValue('chat-1');
jest.mock('@/features/chat/api/database-interactions/find-or-create-private-chat', () => ({
  findOrCreatePrivateChat: (...arguments_: unknown[]): unknown =>
    findOrCreatePrivateChat(...arguments_),
}));

import { startChatFromWristband } from '@/features/chat/api/mutations/start-chat-from-wristband';

let addressBook: { ownerId: string; contactId: string }[];
const chatUsers = new Set(['lea', 'avp-uster', 'flurin', 'sani']);

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  user: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve(chatUsers.has(where.uuid) ? { uuid: where.uuid } : null),
  },
  addressBookEntry: {
    createMany: ({ data }: { data: { ownerId: string; contactId: string }[] }): Promise<void> => {
      addressBook.push(...data);
      return Promise.resolve();
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ startChatFromWristband }));
const callerAs = (uuid: string, groupIds: number[] = []): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: groupIds, name: uuid, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const flurin = callerAs('flurin');
const sani = callerAs('sani', [110]);

beforeEach(() => {
  findOrCreatePrivateChat.mockClear();
  addressBook = [];
});

describe('starting a chat from a tapped band', () => {
  it.each([
    ['without a signature', null],
    ['with a signature that does not match', FORGED_SIGNATURE],
  ])('starts nothing for a band %s, which a guessed UID would be', async (_what, signature) => {
    await expect(flurin.startChatFromWristband({ uid: LEA_BAND, signature })).resolves.toEqual({
      status: 'notVerified',
    });
    await expect(
      sani.startChatFromWristband({ uid: LEA_BAND, signature, avpUserId: 'avp-uster' }),
    ).resolves.toEqual({ status: 'notVerified' });
    expect(findOrCreatePrivateChat).not.toHaveBeenCalled();
    expect(addressBook).toEqual([]);
  });

  it('refuses a signature that is no signature at all', async () => {
    await expect(
      flurin.startChatFromWristband({ uid: LEA_BAND, signature: 'AB' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('opens the chat with the wearer and puts both into each other’s address book', async () => {
    await expect(
      flurin.startChatFromWristband({ uid: LEA_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      status: 'started',
      chatId: 'chat-1',
    });
    expect(findOrCreatePrivateChat).toHaveBeenCalledWith(
      expect.objectContaining({ otherUserId: 'lea' }),
    );
    expect(addressBook).toEqual([
      { ownerId: 'flurin', contactId: 'lea' },
      { ownerId: 'lea', contactId: 'flurin' },
    ]);
  });

  it('says so for the own band', async () => {
    await expect(
      callerAs('lea').startChatFromWristband({ uid: LEA_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      status: 'ownBand',
    });
    expect(findOrCreatePrivateChat).not.toHaveBeenCalled();
  });

  it('starts nothing with a wearer who never logged into the app', async () => {
    await expect(
      flurin.startChatFromWristband({ uid: TIM_BAND, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      status: 'noAccount',
    });
    expect(addressBook).toEqual([]);
  });

  it.each([
    ['nobody knows', '04FFFFFFFFFFFF'],
    ['nobody wears', SPARE_BAND],
  ])('names nobody for a band %s', async (_what, uid) => {
    await expect(
      flurin.startChatFromWristband({ uid, signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      status: 'unknownBand',
    });
    expect(findOrCreatePrivateChat).not.toHaveBeenCalled();
  });

  it('names nobody for a blocked band', async () => {
    bands['04000000000000'] = { band: 'revoked', hofId: null, registration: null };
    await expect(
      flurin.startChatFromWristband({ uid: '04000000000000', signature: GOOD_SIGNATURE }),
    ).resolves.toEqual({
      status: 'unknownBand',
    });
  });

  it('lets the safety team reach the AVP of the band’s Hof, also of a spare band', async () => {
    await expect(
      sani.startChatFromWristband({
        uid: SPARE_BAND,
        signature: GOOD_SIGNATURE,
        avpUserId: 'avp-uster',
      }),
    ).resolves.toEqual({ status: 'started', chatId: 'chat-1' });
    expect(findOrCreatePrivateChat).toHaveBeenCalledWith(
      expect.objectContaining({ otherUserId: 'avp-uster' }),
    );
  });

  it('reaches nobody through a band who is not the AVP of its Hof', async () => {
    await expect(
      sani.startChatFromWristband({
        uid: LEA_BAND,
        signature: GOOD_SIGNATURE,
        avpUserId: 'flurin',
      }),
    ).resolves.toEqual({ status: 'unknownBand' });
    expect(findOrCreatePrivateChat).not.toHaveBeenCalled();
  });

  it('starts nothing for someone who is not signed in', async () => {
    const guest = createCaller({ prisma, locale: 'de' } as unknown as Context);
    await expect(
      guest.startChatFromWristband({ uid: LEA_BAND, signature: GOOD_SIGNATURE }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('keeps the AVP of a Hof away from everybody but the safety team', async () => {
    await expect(
      flurin.startChatFromWristband({
        uid: LEA_BAND,
        signature: GOOD_SIGNATURE,
        avpUserId: 'avp-uster',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
