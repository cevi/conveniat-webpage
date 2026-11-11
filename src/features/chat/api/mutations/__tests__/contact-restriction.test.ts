import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

/** The people named as organiser on a program entry or a Schichteinsatz. */
let organiserIds: string[];
/** What an admin set in the app feature flags; a key missing here reads its default. */
let flags: Record<string, boolean>;

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({
      findGlobal: (): Promise<unknown> => Promise.resolve({}),
      count: ({ where }: { where: { organiser: { in: string[] } } }): Promise<unknown> =>
        Promise.resolve({
          totalDocs: where.organiser.in.filter((id) => organiserIds.includes(id)).length,
        }),
    }),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
// `createNewChat` reads the enums from the package, which only the generated `@/lib/prisma`
// client provides here.
jest.mock('@/lib/capabilities', () => ({
  checkCapability: (): Promise<boolean> => Promise.resolve(true),
}));
jest.mock('@/lib/db/redis', () => {
  const { FEATURE_FLAG_DEFAULTS } =
    jest.requireActual<typeof import('@/lib/feature-flags')>('@/lib/feature-flags');
  const read = (key: string): boolean => flags[key] ?? FEATURE_FLAG_DEFAULTS[key] ?? false;
  return {
    getFeatureFlag: (key: string): Promise<boolean> => Promise.resolve(read(key)),
    getFeatureFlags: (keys: string[]): Promise<Record<string, boolean>> =>
      Promise.resolve(Object.fromEntries(keys.map((key) => [key, read(key)]))),
    // every rate limit counter at its first call
    redis: { eval: (): Promise<number> => Promise.resolve(1) },
  };
});
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));

import { addParticipants } from '@/features/chat/api/mutations/add-participants';
import { createChat } from '@/features/chat/api/mutations/create-chat';
import { listContacts } from '@/features/chat/api/queries/list-contacts';
import {
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP,
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN,
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF,
  FEATURE_FLAG_RESTRICT_CONTACT_LIST,
} from '@/lib/feature-flags';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';

interface Person {
  uuid: string;
  hidden: boolean;
  testAccount: boolean;
  hofIds: string[];
  avpHofIds: string[];
  funktionIds: string[];
  /** Whose address book this person is in. */
  inAddressBooksOf: string[];
}

const person = (letter: string, details: Partial<Person> = {}): Person => ({
  uuid: letter.repeat(24),
  hidden: false,
  testAccount: false,
  hofIds: [],
  avpHofIds: [],
  funktionIds: [],
  inAddressBooksOf: [],
  ...details,
});

const ANNA = person('a', { hofIds: ['cevi-uster'] });
const HOF_MATE = person('b', { hofIds: ['cevi-uster'] });
const SCANNED = person('c', { hofIds: ['zueri-11'], inAddressBooksOf: [ANNA.uuid] });
const AVP = person('d', { hofIds: ['zueri-11'], avpHofIds: ['zueri-11'] });
const RESSORT_MEMBER = person('e', { funktionIds: ['koma'] });
const STRANGER = person('f', { hofIds: ['zueri-11'] });
const HIDDEN_HOF_MATE = person('0', { hofIds: ['cevi-uster'], hidden: true });
const people = [ANNA, HOF_MATE, SCANNED, AVP, RESSORT_MEMBER, STRANGER, HIDDEN_HOF_MATE];

const CHAT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

interface UserFilter {
  AND?: UserFilter[];
  OR?: UserFilter[];
  uuid?: { not?: string; in?: string[] };
  hidden?: boolean;
  hofIds?: { hasSome: string[] };
  avpHofIds?: { isEmpty: boolean };
  funktionIds?: { isEmpty: boolean };
  inAddressBooksOf?: { some: { ownerId: string } };
}

/** The part of Prisma's user filter the contact list is written in. */
const matches = (user: Person, where: UserFilter): boolean =>
  (where.AND ?? []).every((part) => matches(user, part)) &&
  (where.OR === undefined || where.OR.some((part) => matches(user, part))) &&
  (where.uuid?.not === undefined || user.uuid !== where.uuid.not) &&
  (where.uuid?.in === undefined || where.uuid.in.includes(user.uuid)) &&
  (where.hidden === undefined || user.hidden === where.hidden) &&
  (where.hofIds === undefined || where.hofIds.hasSome.some((id) => user.hofIds.includes(id))) &&
  (where.avpHofIds === undefined || (user.avpHofIds.length === 0) === where.avpHofIds.isEmpty) &&
  (where.funktionIds === undefined ||
    (user.funktionIds.length === 0) === where.funktionIds.isEmpty) &&
  (where.inAddressBooksOf === undefined ||
    user.inAddressBooksOf.includes(where.inAddressBooksOf.some.ownerId));

/** Every write that reached the database. */
let writes: string[];

const mockPrisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(mockPrisma),
  $executeRaw: (): Promise<number> => Promise.resolve(1),
  user: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve(people.find((user) => user.uuid === where.uuid)),
    findMany: ({ where }: { where: UserFilter }): Promise<unknown> =>
      Promise.resolve(people.filter((user) => matches(user, where))),
  },
  chat: {
    // Anna has no private chat yet, and owns the group she adds people to.
    findFirst: (): Promise<unknown> => Promise.resolve(null),
    findUniqueOrThrow: (): Promise<unknown> =>
      Promise.resolve({
        uuid: CHAT_ID,
        name: 'Cevi Uster',
        type: ChatType.GROUP,
        archivedAt: undefined,
        createdAt: new Date(0),
        lastUpdate: new Date(0),
        chatMemberships: [
          { userId: ANNA.uuid, chatId: CHAT_ID, chatPermission: ChatMembershipPermission.OWNER },
        ],
      }),
    create: (): Promise<unknown> => {
      writes.push('chat.create');
      return Promise.resolve({ uuid: CHAT_ID });
    },
  },
  chatMembership: {
    createMany: ({ data }: { data: unknown[] }): Promise<unknown> => {
      writes.push(`chatMembership.createMany(${data.length})`);
      return Promise.resolve({ count: data.length });
    },
  },
};

const caller = createCallerFactory(createTRPCRouter({ createChat, addParticipants, listContacts }))(
  {
    user: { uuid: ANNA.uuid, group_ids: [], name: 'Anna', email: 'anna@example.test' },
    prisma: mockPrisma,
    locale: 'de',
  } as unknown as Context,
);

const rejection = (call: Promise<unknown>): Promise<unknown> =>
  call.then(
    () => 'resolved',
    (error: unknown) => error,
  );

const startChat = (...members: Person[]): Promise<unknown> =>
  caller.createChat({
    members: members.map(({ uuid }) => ({ userId: uuid })),
    ...(members.length > 1 ? { chatName: 'Züri 11' } : {}),
  });

const add = (...members: Person[]): Promise<unknown> =>
  caller.addParticipants({ chatId: CHAT_ID, participantIds: members.map(({ uuid }) => uuid) });

const expectRefused = async (call: Promise<unknown>): Promise<void> => {
  const error = await rejection(call);

  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe('FORBIDDEN');
  expect(error).toMatchObject({ reason: 'notAContact' });
  expect(writes).toEqual([]);
};

/** Whom Anna's contact list shows, by the letter of each person. */
const contactList = async (): Promise<string[]> => {
  const contacts = await caller.listContacts({});
  return contacts.map(({ userId }) => userId[0] ?? '?').toSorted();
};

beforeEach(() => {
  ANNA.testAccount = false;
  flags = {};
  organiserIds = [];
  writes = [];
});

describe('starting a chat while the contact list is restricted', () => {
  it.each([
    ['someone from the same Hof', HOF_MATE],
    ['someone whose QR code was scanned', SCANNED],
    ['the AVP of another Hof', AVP],
    ['someone holding a function', RESSORT_MEMBER],
  ])('opens a private chat with %s', async (_who, contact) => {
    await startChat(contact);

    expect(writes).toEqual(['chat.create']);
  });

  it('refuses a private chat with someone outside the contact list', async () => {
    await expectRefused(startChat(STRANGER));
  });

  it('refuses a private chat with a hidden person', async () => {
    await expectRefused(startChat(HIDDEN_HOF_MATE));
  });

  it('refuses a person who does not exist', async () => {
    await expectRefused(startChat(person('9')));
  });

  it('opens a private chat with an organiser, as the schedule offers it', async () => {
    organiserIds = [STRANGER.uuid];

    await startChat(STRANGER);

    expect(writes).toEqual(['chat.create']);
  });

  it('creates a group of contacts', async () => {
    await startChat(HOF_MATE, SCANNED, AVP);

    expect(writes).toEqual(['chat.create']);
  });

  it('refuses a group as soon as one member is not a contact', async () => {
    await expectRefused(startChat(HOF_MATE, STRANGER));
  });

  it('does not let an organiser be pulled into a group', async () => {
    organiserIds = [STRANGER.uuid];

    await expectRefused(startChat(HOF_MATE, STRANGER));
  });
});

describe('adding participants while the contact list is restricted', () => {
  it('adds contacts', async () => {
    await add(HOF_MATE, AVP);

    expect(writes).toEqual(['chatMembership.createMany(2)']);
  });

  it('refuses someone outside the contact list, also next to a contact', async () => {
    await expectRefused(add(HOF_MATE, STRANGER));
  });

  it('refuses an organiser who is not a contact', async () => {
    organiserIds = [STRANGER.uuid];

    await expectRefused(add(STRANGER));
  });
});

describe('choosing the groups of the restricted contact list', () => {
  it('lists the address book and all three groups by default', async () => {
    await expect(contactList()).resolves.toEqual(['b', 'c', 'd', 'e']);
  });

  it.each([
    ['the own Hof', FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF, HOF_MATE, ['c', 'd', 'e']],
    [
      'the functions',
      FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN,
      RESSORT_MEMBER,
      ['b', 'c', 'd'],
    ],
    ['the AVP', FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP, AVP, ['b', 'c', 'e']],
  ])('without %s, drops that group and refuses it', async (_group, flag, dropped, listed) => {
    flags[flag] = false;

    await expect(contactList()).resolves.toEqual(listed);
    await expectRefused(startChat(dropped));
  });

  describe('with all three groups off', () => {
    beforeEach(() => {
      flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF] = false;
      flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN] = false;
      flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP] = false;
    });

    it('lists only the address book', async () => {
      await expect(contactList()).resolves.toEqual(['c']);
    });

    it('still opens a chat with someone from the address book', async () => {
      await startChat(SCANNED);

      expect(writes).toEqual(['chat.create']);
    });

    it('refuses everyone else, also when adding them to a group', async () => {
      await expectRefused(add(HOF_MATE, AVP, RESSORT_MEMBER));
    });

    it('still opens a chat with an organiser, as the schedule offers it', async () => {
      organiserIds = [AVP.uuid];

      await startChat(AVP);

      expect(writes).toEqual(['chat.create']);
    });

    it('leaves a test account its own Hof', async () => {
      ANNA.testAccount = true;

      await expect(contactList()).resolves.toEqual(['b', 'c']);
    });
  });
});

describe('with the contact list open to everyone', () => {
  beforeEach(() => {
    flags[FEATURE_FLAG_RESTRICT_CONTACT_LIST] = false;
  });

  it('lists everyone who is not hidden', async () => {
    await expect(contactList()).resolves.toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('ignores which groups the restricted list would include', async () => {
    flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF] = false;
    flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN] = false;
    flags[FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP] = false;

    await expect(contactList()).resolves.toEqual(['b', 'c', 'd', 'e', 'f']);
    await startChat(STRANGER);

    expect(writes).toEqual(['chat.create']);
  });

  it('opens a private chat with anyone', async () => {
    await startChat(STRANGER);

    expect(writes).toEqual(['chat.create']);
  });

  it('adds anyone to a group', async () => {
    await add(STRANGER);

    expect(writes).toEqual(['chatMembership.createMany(1)']);
  });

  it('still refuses a hidden person', async () => {
    await expectRefused(startChat(HIDDEN_HOF_MATE));
  });
});

describe('as a test account', () => {
  beforeEach(() => {
    ANNA.testAccount = true;
  });

  it.each([
    ['someone from the same Hof', HOF_MATE],
    ['someone whose QR code was scanned', SCANNED],
  ])('opens a private chat with %s', async (_who, contact) => {
    await startChat(contact);

    expect(writes).toEqual(['chat.create']);
  });

  it.each([
    ['the AVP of another Hof', AVP],
    ['someone holding a function', RESSORT_MEMBER],
  ])('refuses a private chat with %s', async (_who, contact) => {
    await expectRefused(startChat(contact));
  });

  it('stays restricted with the contact list open to everyone', async () => {
    flags[FEATURE_FLAG_RESTRICT_CONTACT_LIST] = false;

    await expectRefused(startChat(STRANGER));
  });
});
