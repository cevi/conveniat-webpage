import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/db/redis', () => ({ getFeatureFlag: jest.fn(), setFeatureFlag: jest.fn() }));
jest.mock('@/lib/db/chat-pubsub', () => ({ chatPubSub: { publish: jest.fn() } }));
jest.mock('@/lib/s3', () => ({ S3_BUCKET_NAME: 'bucket', s3ClientPublic: {} }));
jest.mock('@/features/chat/api/utils/send-push-notifications', () => ({
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

const mockChatFindMany = jest.fn();
const prisma = { chat: { findMany: mockChatFindMany } };

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
