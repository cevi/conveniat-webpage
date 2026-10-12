import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/db/redis', () => ({ getFeatureFlag: jest.fn(), setFeatureFlag: jest.fn() }));
jest.mock('@/lib/db/chat-pubsub', () => ({ chatPubSub: { publish: jest.fn() } }));
jest.mock('@/lib/s3', () => ({ S3_BUCKET_NAME: 'bucket', s3ClientPublic: {} }));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: jest.fn(),
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [542],
    CEVIDB_GROUP_TRANSLATION_TEAM: [543],
    CEVIDB_GROUP_PROGRAM_TEAM: [544],
  },
}));

// `superjson` ships untranspiled ESM and is only the wire transformer; a direct caller never
// serializes anything, so a stub keeps this suite out of the ESM transform allowlist.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { adminRouter } from '@/features/admin/api/admin-router';

const SUPPORT_CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const ALERT_CHAT_ID = '0190a5b2-0000-7000-8000-000000000002';
const PRIVATE_CHAT_ID = '0190a5b2-0000-7000-8000-000000000003';
const GROUP_CHAT_ID = '0190a5b2-0000-7000-8000-000000000004';

const CHAT_TYPES: Record<string, string> = {
  [SUPPORT_CHAT_ID]: 'SUPPORT_GROUP',
  [ALERT_CHAT_ID]: 'EMERGENCY',
  [PRIVATE_CHAT_ID]: 'ONE_TO_ONE',
  [GROUP_CHAT_ID]: 'GROUP',
};

const mockChatFindMany = jest.fn();
const mockChatCount = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageCreate = jest.fn();
const mockChatUpdate = jest.fn();
const prisma = {
  chat: {
    findMany: mockChatFindMany,
    count: mockChatCount,
    update: mockChatUpdate,
    findUnique: jest.fn(({ where }: { where: { uuid: string } }) => {
      const type = CHAT_TYPES[where.uuid];
      return Promise.resolve(
        // eslint-disable-next-line unicorn/no-null
        type === undefined ? null : { type, capabilities: [], chatMemberships: [] },
      );
    }),
  },
  message: { findMany: mockMessageFindMany, create: mockMessageCreate },
};

const createCaller = createCallerFactory(adminRouter);

const callerAs = (user: unknown): ReturnType<typeof createCaller> =>
  createCaller({ user, prisma, locale: 'de' } as unknown as Context);

/** No session at all. */
const signedOut = undefined as unknown;

/** A camp participant: signed in through Cevi.DB, in no admin group. */
const participant = { uuid: 'participant-1', group_ids: [] };

/** The translation team reaches the admin panel, but not the chat management. */
const translationTeam = { uuid: 'translator-1', group_ids: [543] };

const webCoreTeam = { uuid: 'web-1', group_ids: [542] };

const fullAdmin = { uuid: 'admin-1', group_ids: [541] };

describe('admin.listSupportChats access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatFindMany.mockResolvedValue([]);
  });

  it('refuses the chat list to anyone signed out', async () => {
    await expect(callerAs(signedOut).listSupportChats()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mockChatFindMany).not.toHaveBeenCalled();
  });

  it('refuses the chat list to a participant, whatever chat type they ask for', async () => {
    await expect(
      callerAs(participant).listSupportChats({ type: 'ONE_TO_ONE' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockChatFindMany).not.toHaveBeenCalled();
  });

  it('refuses the chat list to the translation team', async () => {
    await expect(callerAs(translationTeam).listSupportChats()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockChatFindMany).not.toHaveBeenCalled();
  });

  it('shows the chat list to the web core team', async () => {
    await expect(callerAs(webCoreTeam).listSupportChats()).resolves.toEqual([]);
    expect(mockChatFindMany).toHaveBeenCalledTimes(1);
  });
});

describe('the support desk of the web core team', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatFindMany.mockResolvedValue([]);
    mockChatCount.mockResolvedValue(0);
    mockMessageFindMany.mockResolvedValue([]);
  });

  it('lists the emergency alerts', async () => {
    await expect(callerAs(webCoreTeam).listSupportChats({ type: 'EMERGENCY' })).resolves.toEqual(
      [],
    );
  });

  it.each(['ONE_TO_ONE', 'GROUP', 'COURSE_GROUP', 'ANNOUNCEMENT'] as const)(
    'refuses to list the %s chats with their messages',
    async (type) => {
      await expect(callerAs(webCoreTeam).listSupportChats({ type })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(mockChatFindMany).not.toHaveBeenCalled();
    },
  );

  it('does not pull a private chat into the support list by its id', async () => {
    await callerAs(webCoreTeam).listSupportChats({ includeId: PRIVATE_CHAT_ID });

    const [{ where }] = mockChatFindMany.mock.calls[0] as [{ where: { OR: unknown[] } }];
    expect(where.OR[1]).toEqual({ uuid: PRIVATE_CHAT_ID, type: 'SUPPORT_GROUP' });
  });

  it.each([
    ['a support chat', SUPPORT_CHAT_ID],
    ['an emergency alert', ALERT_CHAT_ID],
  ])('reads the messages of %s', async (_, chatId) => {
    await expect(callerAs(webCoreTeam).getChatMessages({ chatId })).resolves.toMatchObject({
      messages: [],
    });
  });

  it.each([
    ['a private chat', PRIVATE_CHAT_ID],
    ['a group chat', GROUP_CHAT_ID],
  ])('refuses the messages of %s', async (_, chatId) => {
    await expect(callerAs(webCoreTeam).getChatMessages({ chatId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockMessageFindMany).not.toHaveBeenCalled();
  });

  it('refuses to write into, close or join a private chat', async () => {
    const caller = callerAs(webCoreTeam);
    const forbidden = { code: 'FORBIDDEN' };

    await expect(
      caller.postAdminMessage({ chatId: PRIVATE_CHAT_ID, content: 'Hoi' }),
    ).rejects.toMatchObject(forbidden);
    await expect(caller.closeChat({ chatId: PRIVATE_CHAT_ID })).rejects.toMatchObject(forbidden);
    await expect(caller.markChatAsRead({ chatId: PRIVATE_CHAT_ID })).rejects.toMatchObject(
      forbidden,
    );
    await expect(
      caller.addMemberToChat({ chatId: PRIVATE_CHAT_ID, userId: 'web-1' }),
    ).rejects.toMatchObject(forbidden);
    await expect(
      caller.getAdminUploadUrl({
        chatId: PRIVATE_CHAT_ID,
        contentType: 'image/png',
        contentLength: 2048,
      }),
    ).rejects.toMatchObject(forbidden);

    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockChatUpdate).not.toHaveBeenCalled();
  });

  it('refuses the list of every chat and its members', async () => {
    await expect(callerAs(webCoreTeam).getChatList()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockChatFindMany).not.toHaveBeenCalled();
  });
});

describe('the chat oversight of the full admins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatFindMany.mockResolvedValue([]);
    mockChatCount.mockResolvedValue(0);
    mockMessageFindMany.mockResolvedValue([]);
  });

  it('reads the messages of a private chat', async () => {
    await expect(
      callerAs(fullAdmin).getChatMessages({ chatId: PRIVATE_CHAT_ID }),
    ).resolves.toMatchObject({ messages: [] });
  });

  it('lists every chat and its members', async () => {
    await expect(callerAs(fullAdmin).getChatList()).resolves.toMatchObject({ chats: [], total: 0 });
  });

  it('answers not found for a chat that does not exist', async () => {
    await expect(
      callerAs(fullAdmin).getChatMessages({ chatId: '0190a5b2-0000-7000-8000-00000000ffff' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
