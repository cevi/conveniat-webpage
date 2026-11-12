jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

type Permission = 'OWNER' | 'ADMIN' | 'MEMBER';
/** who holds which function in Postgres, and the memberships of one topic chat */
let functionsOf: Record<string, string[]>;
let memberships: Map<string, Permission>;
/** one open private conversation of the topic, which Tim wrote, and who is in it */
let conversation: Map<string, Permission>;
const CONVERSATION = 'chat-conversation';

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
    chat: {
      findMany: (): Promise<unknown> =>
        Promise.resolve([
          {
            uuid: CONVERSATION,
            chatMemberships: [...conversation].map(([userId, chatPermission]) => ({
              userId,
              chatPermission,
            })),
            forumPosts: [{ message: { senderId: 'tim' } }],
          },
        ]),
    },
    chatMembership: {
      findMany: ({
        where,
      }: {
        where: { chatPermission?: { in: Permission[] } };
      }): Promise<unknown> =>
        Promise.resolve(
          [...memberships]
            .filter(([, permission]) => where.chatPermission?.in.includes(permission) ?? true)
            .map(([userId, chatPermission]) => ({
              userId,
              chatPermission,
              forumConversationPushOff: false,
            })),
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
        where: { userId_chatId: { userId: string; chatId: string } };
        create: { chatPermission: Permission };
      }): Promise<void> => {
        const chat = where.userId_chatId.chatId === CONVERSATION ? conversation : memberships;
        chat.set(where.userId_chatId.userId, create.chatPermission);
        return Promise.resolve();
      },
      deleteMany: ({
        where,
      }: {
        where: { chatId: string; userId: { in: string[] } };
      }): Promise<void> => {
        const chat = where.chatId === CONVERSATION ? conversation : memberships;
        for (const id of where.userId.in) chat.delete(id);
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
  conversation = new Map<string, Permission>([
    ['tim', 'MEMBER'],
    ['webteam', 'ADMIN'],
    ['noah', 'ADMIN'],
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

  it('answers the open private conversations of the topic as it is now', async () => {
    await syncForumKernteam(TOPIC, [RESSORTLEITUNG_INFRA]);

    expect(Object.fromEntries(conversation)).toEqual({
      // the writer stays, Noah left the Kernteam and the conversation, Mira joined it
      tim: 'MEMBER',
      webteam: 'ADMIN',
      mira: 'ADMIN',
    });
  });

  it('keeps the writer of a conversation in it, even once they leave the Kernteam', async () => {
    functionsOf['tim'] = [RESSORTLEITUNG_KOMA];
    memberships.set('tim', 'ADMIN');
    conversation.set('tim', 'ADMIN');

    await syncForumKernteam(TOPIC, [RESSORTLEITUNG_INFRA]);

    expect(conversation.has('tim')).toBe(true);
  });
});
