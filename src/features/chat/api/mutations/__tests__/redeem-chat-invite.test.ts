import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
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

// Creating the chat is covered elsewhere; here it only matters how often it happens.
const findOrCreatePrivateChat = jest.fn().mockResolvedValue('chat-with-issuer');
jest.mock('@/features/chat/api/database-interactions/find-or-create-private-chat', () => ({
  findOrCreatePrivateChat: (...arguments_: unknown[]): unknown =>
    findOrCreatePrivateChat(...arguments_),
}));

import { redeemChatInvite } from '@/features/chat/api/mutations/redeem-chat-invite';

interface Invite {
  token: string;
  issuerId: string;
  expiresAt: Date;
  redeemedById: string | null;
  chatId: string | null;
}

let invites: Invite[];

/** The ChatInvite table, with the conditional update behaving like Postgres. */
const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  chatInvite: {
    findUnique: ({ where }: { where: { token: string } }): Promise<Invite | null> =>
      // eslint-disable-next-line unicorn/no-null
      Promise.resolve(invites.find((invite) => invite.token === where.token) ?? null),
    updateMany: ({
      where,
      data,
    }: {
      where: { token: string; expiresAt: { gt: Date } };
      data: { redeemedById: string };
    }): Promise<{ count: number }> => {
      const invite = invites.find(
        (candidate) =>
          candidate.token === where.token &&
          candidate.redeemedById === null &&
          candidate.expiresAt > where.expiresAt.gt,
      );
      if (invite === undefined) return Promise.resolve({ count: 0 });
      invite.redeemedById = data.redeemedById;
      return Promise.resolve({ count: 1 });
    },
    update: ({
      where,
      data,
    }: {
      where: { token: string };
      data: { chatId: string };
    }): Promise<void> => {
      const invite = invites.find((candidate) => candidate.token === where.token);
      if (invite !== undefined) invite.chatId = data.chatId;
      return Promise.resolve();
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ redeemChatInvite }));
const redeemAs = (
  uuid: string,
  token: string,
): ReturnType<ReturnType<typeof createCaller>['redeemChatInvite']> =>
  createCaller({
    user: { uuid, group_ids: [], name: uuid, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context).redeemChatInvite({ token });

/** An invite nobody has redeemed yet, as `createChatInvite` stores it. */
const unredeemed = (token: string, expiresInMs: number): Invite => ({
  token,
  issuerId: 'issuer',
  expiresAt: new Date(Date.now() + expiresInMs),
  // eslint-disable-next-line unicorn/no-null
  redeemedById: null,
  // eslint-disable-next-line unicorn/no-null
  chatId: null,
});

beforeEach(() => {
  findOrCreatePrivateChat.mockClear();
  invites = [unredeemed('fresh', 60_000), unredeemed('expired', -1000)];
});

describe('redeeming a chat invite', () => {
  it('opens the chat with the person who showed the code', async () => {
    await expect(redeemAs('scanner', 'fresh')).resolves.toEqual({
      status: 'redeemed',
      chatId: 'chat-with-issuer',
    });
    expect(findOrCreatePrivateChat).toHaveBeenCalledWith(
      expect.objectContaining({ otherUserId: 'issuer' }),
    );
  });

  it('answers a phone opening the scanned link again with the same chat', async () => {
    await redeemAs('scanner', 'fresh');
    await redeemAs('scanner', 'fresh');
    await expect(redeemAs('scanner', 'fresh')).resolves.toEqual({
      status: 'redeemed',
      chatId: 'chat-with-issuer',
    });

    expect(findOrCreatePrivateChat).toHaveBeenCalledTimes(1);
  });

  it('does not let a second person use a code someone already scanned', async () => {
    await redeemAs('scanner', 'fresh');

    await expect(redeemAs('someone-else', 'fresh')).resolves.toEqual({ status: 'invalid' });
    expect(findOrCreatePrivateChat).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired code', async () => {
    await expect(redeemAs('scanner', 'expired')).resolves.toEqual({ status: 'invalid' });
    expect(findOrCreatePrivateChat).not.toHaveBeenCalled();
  });

  it('rejects a user id, which is what printed QR codes from before carry', async () => {
    await expect(redeemAs('scanner', 'issuer')).resolves.toEqual({ status: 'invalid' });
  });

  it('does not use up a code when its owner scans it', async () => {
    await expect(redeemAs('issuer', 'fresh')).resolves.toEqual({ status: 'ownInvite' });
    await expect(redeemAs('scanner', 'fresh')).resolves.toMatchObject({ status: 'redeemed' });
  });
});
