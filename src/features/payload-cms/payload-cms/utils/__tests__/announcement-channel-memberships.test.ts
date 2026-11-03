jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    user: { findMany: jest.fn() },
    chatMembership: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  },
}));
jest.mock('@/lib/db/publish-membership-revoked', () => ({ publishMembershipRevoked: jest.fn() }));

import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import { resyncAvpChannels } from '@/features/payload-cms/payload-cms/utils/announcement-channel-memberships';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import type { Payload } from 'payload';

/** The Cevi.DB group of Cevi Uster's Hof. */
const USTER = 4101;
const AVP_CHAT = 'chat-avps';

const memberships = jest.mocked(prisma.chatMembership);
const users = jest.mocked(prisma.user);

/** A payload holding the given Höfe, one AVP channel, and Pia, Adressverwalterin of Cevi Uster. */
const payloadWith = (hofGroupIds: number[]): Payload =>
  ({
    find: jest.fn(({ collection }: { collection: string }) => {
      if (collection === 'announcement-channels') {
        return Promise.resolve({ docs: [{ targetType: 'avps', chatUuid: AVP_CHAT }] });
      }
      if (collection === 'hoefe') {
        return Promise.resolve({ docs: hofGroupIds.map((id) => ({ groupId: String(id) })) });
      }
      return Promise.resolve({
        docs: [{ id: 'pia', groups: [{ id: USTER, role_class: HOF_ADMINISTRATOR_ROLE_CLASS }] }],
      });
    }),
  }) as unknown as Payload;

describe('resyncAvpChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    users.findMany.mockResolvedValue([{ uuid: 'pia' }] as never);
  });

  it('adds the AVP of a Hof the sync just created', async () => {
    memberships.findMany.mockResolvedValue([]);

    await expect(resyncAvpChannels(payloadWith([USTER]))).resolves.toBe(1);

    const [added] = memberships.createMany.mock.calls[0] ?? [];
    expect(added?.data).toEqual([expect.objectContaining({ chatId: AVP_CHAT, userId: 'pia' })]);
  });

  it('removes the AVP of a Hof that is gone, and tells their open streams', async () => {
    memberships.findMany.mockResolvedValue([
      { userId: 'pia', chatId: AVP_CHAT, chatPermission: 'GUEST' },
    ] as never);

    await resyncAvpChannels(payloadWith([]));

    const [removal] = memberships.deleteMany.mock.calls[0] ?? [];
    expect(removal?.where).toMatchObject({ chatId: AVP_CHAT, userId: { in: ['pia'] } });
    expect(publishMembershipRevoked).toHaveBeenCalledWith('pia', AVP_CHAT, 'pia');
  });
});
