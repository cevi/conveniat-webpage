jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

type Permission = 'OWNER' | 'ADMIN' | 'MEMBER';
/** who holds which function in Postgres, and the memberships of one topic chat */
let functionsOf: Record<string, string[]>;
let memberships: Map<string, Permission>;

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: ({ where }: { where: { funktionIds: { hasSome: string[] } } }): Promise<unknown> =>
        Promise.resolve(
          Object.entries(functionsOf)
            .filter(([, ids]) => ids.some((id) => where.funktionIds.hasSome.includes(id)))
            .map(([uuid]) => ({ uuid })),
        ),
    },
    chatMembership: {
      findMany: (): Promise<unknown> =>
        Promise.resolve(
          [...memberships].map(([userId, chatPermission]) => ({ userId, chatPermission })),
        ),
      findUnique: ({
        where,
      }: {
        where: { userId_chatId: { userId: string } };
      }): Promise<unknown> => {
        const permission = memberships.get(where.userId_chatId.userId);
        return Promise.resolve(permission === undefined ? null : { chatPermission: permission });
      },
      upsert: ({
        where,
        create,
      }: {
        where: { userId_chatId: { userId: string } };
        create: { chatPermission: Permission };
      }): Promise<void> => {
        memberships.set(where.userId_chatId.userId, create.chatPermission);
        return Promise.resolve();
      },
      update: ({
        where,
        data,
      }: {
        where: { userId_chatId: { userId: string } };
        data: { chatPermission: Permission };
      }): Promise<void> => {
        memberships.set(where.userId_chatId.userId, data.chatPermission);
        return Promise.resolve();
      },
      updateMany: ({
        where,
        data,
      }: {
        where: { userId: { in: string[] } };
        data: { chatPermission: Permission };
      }): Promise<void> => {
        for (const id of where.userId.in) memberships.set(id, data.chatPermission);
        return Promise.resolve();
      },
    },
  },
}));

import {
  syncForumKernteam,
  syncForumKernteamOfUser,
} from '@/features/payload-cms/payload-cms/chat-channels/forum-kernteam';
import type { Payload } from 'payload';

const TOPIC = 'chat-platz';
const RESSORTLEITUNG_INFRA = 'funktion-infra';
const RESSORTLEITUNG_KOMA = 'funktion-koma';

beforeEach(() => {
  // Mira leads Infrastruktur, Noah KOMA, Sina holds nothing
  functionsOf = { mira: [RESSORTLEITUNG_INFRA], noah: [RESSORTLEITUNG_KOMA], sina: [] };
  memberships = new Map<string, Permission>([
    ['webteam', 'OWNER'],
    ['noah', 'ADMIN'],
    ['sina', 'MEMBER'],
  ]);
});

describe('the Kernteam of a forum topic', () => {
  it('is whoever holds one of its functions, and nobody else', async () => {
    const demoted = await syncForumKernteam(TOPIC, [RESSORTLEITUNG_INFRA]);

    expect(Object.fromEntries(memberships)).toEqual({
      // the editor who created the topic keeps it
      webteam: 'OWNER',
      mira: 'ADMIN',
      noah: 'MEMBER',
      sina: 'MEMBER',
    });
    expect(demoted).toBe(1);
  });

  it('follows a person whose functions changed in Cevi.DB', async () => {
    const payload = {
      find: () =>
        Promise.resolve({
          docs: [{ chatUuid: TOPIC, kernteamFunktionen: [RESSORTLEITUNG_INFRA] }],
        }),
    } as unknown as Payload;

    await syncForumKernteamOfUser(payload, 'sina', [RESSORTLEITUNG_INFRA]);
    expect(memberships.get('sina')).toBe('ADMIN');

    await syncForumKernteamOfUser(payload, 'sina', []);
    expect(memberships.get('sina')).toBe('MEMBER');
  });
});
