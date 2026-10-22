import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
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
const mockPublish = jest.fn((): Promise<void> => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...args: unknown[]): unknown => mockPublish(...(args as [])) },
}));

import { markChatUnread } from '@/features/chat/api/mutations/mark-chat-unread';
import { muteChat } from '@/features/chat/api/mutations/mute-chat';
import { pinChat } from '@/features/chat/api/mutations/pin-chat';
import { ChatType } from '@/lib/prisma';

const GROUP_CHAT = '0192f3a4-0000-7000-8000-000000000011';
const EMERGENCY_CHAT = '0192f3a4-0000-7000-8000-000000000012';
const OTHER_CHAT = '0192f3a4-0000-7000-8000-000000000013';
const ANNA = 'anna';
const BEN = 'ben';

interface Membership {
  userId: string;
  chatId: string;
  pinnedAt: Date | null;
  mutedAt: Date | null;
  markedUnread: boolean;
}

const chatTypes = new Map<string, ChatType>([
  [GROUP_CHAT, ChatType.GROUP],
  [EMERGENCY_CHAT, ChatType.EMERGENCY],
  [OTHER_CHAT, ChatType.GROUP],
]);

let memberships: Membership[];

const membership = (userId: string, chatId: string): Membership => ({
  userId,
  chatId,
  /* eslint-disable unicorn/no-null -- what Postgres answers for an untouched membership */
  pinnedAt: null,
  mutedAt: null,
  /* eslint-enable unicorn/no-null */
  markedUnread: false,
});

const find = (key: { userId: string; chatId: string }): Membership | undefined =>
  memberships.find((m) => m.userId === key.userId && m.chatId === key.chatId);

/** The membership table, with just enough of Prisma's behaviour for these procedures. */
const prisma = {
  chatMembership: {
    findUnique: ({
      where,
    }: {
      where: { userId_chatId: { userId: string; chatId: string } };
    }): Promise<unknown> => {
      const row = find(where.userId_chatId);
      return Promise.resolve(
        // eslint-disable-next-line unicorn/no-null
        row === undefined ? null : { ...row, chat: { type: chatTypes.get(row.chatId) } },
      );
    },
    update: ({
      where,
      data,
    }: {
      where: { userId_chatId: { userId: string; chatId: string } };
      data: Partial<Membership>;
    }): Promise<Membership> => {
      const row = find(where.userId_chatId);
      if (row === undefined) return Promise.reject(new Error('Record to update not found.'));
      Object.assign(row, data);
      return Promise.resolve(row);
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ pinChat, muteChat, markChatUnread }));
const callerAs = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: uuid, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

beforeEach(() => {
  mockPublish.mockClear();
  memberships = [
    membership(ANNA, GROUP_CHAT),
    membership(BEN, GROUP_CHAT),
    membership(ANNA, OTHER_CHAT),
    membership(ANNA, EMERGENCY_CHAT),
  ];
});

/** Every membership except Anna's in the group chat, to check nothing else moved. */
const othersThanAnnasGroupChat = (): Membership[] =>
  memberships.filter((m) => !(m.userId === ANNA && m.chatId === GROUP_CHAT));

describe('settings a person keeps for a chat of their own', () => {
  it.each([
    ['pins', (): Promise<unknown> => callerAs(ANNA).pinChat({ chatId: GROUP_CHAT, pinned: true })],
    ['mutes', (): Promise<unknown> => callerAs(ANNA).muteChat({ chatId: GROUP_CHAT, muted: true })],
    [
      'marks unread',
      (): Promise<unknown> => callerAs(ANNA).markChatUnread({ chatId: GROUP_CHAT, unread: true }),
    ],
  ])('%s the chat for the caller only', async (_, act) => {
    const before = structuredClone(othersThanAnnasGroupChat());

    await act();

    expect(othersThanAnnasGroupChat()).toEqual(before);
    expect(find({ userId: ANNA, chatId: GROUP_CHAT })).not.toEqual(membership(ANNA, GROUP_CHAT));
  });

  it('pins, mutes and marks unread, and takes each back again', async () => {
    const anna = callerAs(ANNA);

    await anna.pinChat({ chatId: GROUP_CHAT, pinned: true });
    await anna.muteChat({ chatId: GROUP_CHAT, muted: true });
    await anna.markChatUnread({ chatId: GROUP_CHAT, unread: true });
    expect(find({ userId: ANNA, chatId: GROUP_CHAT })).toMatchObject({
      pinnedAt: expect.any(Date) as Date,
      mutedAt: expect.any(Date) as Date,
      markedUnread: true,
    });

    await anna.pinChat({ chatId: GROUP_CHAT, pinned: false });
    await anna.muteChat({ chatId: GROUP_CHAT, muted: false });
    await anna.markChatUnread({ chatId: GROUP_CHAT, unread: false });
    expect(find({ userId: ANNA, chatId: GROUP_CHAT })).toEqual(membership(ANNA, GROUP_CHAT));
  });

  // A replayed call from the offline queue must not move a pinned chat back to the top.
  it('keeps the place of a chat pinned twice', async () => {
    const anna = callerAs(ANNA);
    await anna.pinChat({ chatId: GROUP_CHAT, pinned: true });
    const firstPin = find({ userId: ANNA, chatId: GROUP_CHAT })?.pinnedAt;

    await anna.pinChat({ chatId: GROUP_CHAT, pinned: true });

    expect(find({ userId: ANNA, chatId: GROUP_CHAT })?.pinnedAt).toBe(firstPin);
  });

  it('tells the caller’s other devices to refetch their chat list', async () => {
    await callerAs(ANNA).muteChat({ chatId: GROUP_CHAT, muted: true });

    expect(mockPublish).toHaveBeenCalledWith(ANNA, {
      type: 'new_chat',
      chatId: GROUP_CHAT,
      senderId: ANNA,
    });
  });

  it.each([
    ['pin', (): Promise<unknown> => callerAs(BEN).pinChat({ chatId: OTHER_CHAT, pinned: true })],
    ['mute', (): Promise<unknown> => callerAs(BEN).muteChat({ chatId: OTHER_CHAT, muted: true })],
    [
      'mark unread',
      (): Promise<unknown> => callerAs(BEN).markChatUnread({ chatId: OTHER_CHAT, unread: true }),
    ],
  ])('refuses to %s a chat the caller is not a member of', async (_, act) => {
    const before = structuredClone(memberships);

    await expect(act()).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(memberships).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('refuses to mute an emergency chat', async () => {
    const result = callerAs(ANNA).muteChat({ chatId: EMERGENCY_CHAT, muted: true });

    await expect(result).rejects.toBeInstanceOf(TRPCError);
    await expect(result).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(find({ userId: ANNA, chatId: EMERGENCY_CHAT })?.mutedAt).toBeNull();
  });

  it('still pins an emergency chat', async () => {
    await callerAs(ANNA).pinChat({ chatId: EMERGENCY_CHAT, pinned: true });

    expect(find({ userId: ANNA, chatId: EMERGENCY_CHAT })?.pinnedAt).toBeInstanceOf(Date);
  });
});
