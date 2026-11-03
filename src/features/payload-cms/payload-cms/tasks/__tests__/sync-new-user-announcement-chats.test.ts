jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    user: { upsert: jest.fn() },
    chatMembership: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  },
}));
jest.mock('@/lib/db/publish-membership-revoked', () => ({
  publishMembershipRevoked: jest.fn(),
}));

import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import { syncNewUserAnnouncementChatsTask } from '@/features/payload-cms/payload-cms/tasks/sync-new-user-announcement-chats';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import type { PayloadRequest } from 'payload';

const USTER = '4101';
const AVP_CHAT = 'chat-avps';
const EVERYONE_CHAT = 'chat-all';

const memberships = jest.mocked(prisma.chatMembership);

/** Runs the login sync for a user who now holds the given groups. */
const runFor = async (groups: object[]): Promise<void> => {
  const payload = {
    logger: { debug: jest.fn(), error: jest.fn() },
    findByID: jest.fn().mockResolvedValue({ id: 'user-1', fullName: 'Pia Muster', groups }),
    find: jest.fn(({ collection }: { collection: string }) =>
      Promise.resolve({
        docs:
          collection === 'hoefe'
            ? [{ id: 'hof-uster', groupId: USTER }]
            : [
                { targetType: 'avps', chatUuid: AVP_CHAT },
                { targetType: 'all', chatUuid: EVERYONE_CHAT },
              ],
      }),
    ),
  };
  const handler = syncNewUserAnnouncementChatsTask.handler as (args: {
    input: { userId: string };
    req: PayloadRequest;
  }) => Promise<unknown>;
  await handler({ input: { userId: 'user-1' }, req: { payload } as unknown as PayloadRequest });
};

describe('the announcement channel sync on login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    memberships.findMany.mockResolvedValue([]);
  });

  it('adds an Adressverwalter of a Hof to the AVP channel', async () => {
    await runFor([{ id: Number(USTER), role_class: HOF_ADMINISTRATOR_ROLE_CLASS }]);

    const joined = memberships.upsert.mock.calls.map(([call]) => call.create.chatId);
    expect(joined).toEqual([AVP_CHAT, EVERYONE_CHAT]);
  });

  it('takes someone who lost the role out of the AVP channel, and tells their open streams', async () => {
    memberships.findMany.mockResolvedValue([{ chatId: AVP_CHAT }] as never);

    await runFor([
      { id: Number(USTER), role_class: 'Group::MitgliederorganisationExterne::Mitglied' },
    ]);

    const [removal] = memberships.deleteMany.mock.calls[0] ?? [];
    expect(removal?.where).toMatchObject({ userId: 'user-1', chatId: { in: [AVP_CHAT] } });
    expect(publishMembershipRevoked).toHaveBeenCalledWith('user-1', AVP_CHAT, 'user-1');
  });
});
