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

const publish = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...arguments_: unknown[]): unknown => publish(...arguments_) },
}));

import { addParticipants } from '@/features/chat/api/mutations/add-participants';
import { leaveChat } from '@/features/chat/api/mutations/leave-chat';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import type { StaticTranslationString } from '@/types/types';

type Permission = ChatMembershipPermission;

interface Membership {
  userId: string;
  chatId: string;
  hasDeleted: boolean;
  chatPermission: Permission;
}

interface StoredMessage {
  uuid: string;
  chatId: string;
  senderId: string | null;
  createdAt: Date;
  payload: unknown;
}

const CHAT_ID = 'hof-chat';

let chatType: ChatType;
let memberships: Membership[];
let messages: StoredMessage[];

/** The chat tables, with just enough of Prisma's behaviour for these two procedures. */
const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  chat: {
    findUniqueOrThrow: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve({
        uuid: where.uuid,
        name: 'Cevi Uster',
        type: chatType,
        // eslint-disable-next-line unicorn/no-null
        archivedAt: null,
        createdAt: new Date(0),
        lastUpdate: new Date(0),
        chatMemberships: memberships.filter((m) => m.chatId === where.uuid).map((m) => ({ ...m })),
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  chatMembership: {
    update: ({
      where,
      data,
    }: {
      where: { userId_chatId: { userId: string; chatId: string } };
      data: { chatPermission: Permission };
    }): Promise<void> => {
      const membership = memberships.find(
        (m) => m.userId === where.userId_chatId.userId && m.chatId === where.userId_chatId.chatId,
      );
      if (membership === undefined) throw new Error('Record to update not found.');
      membership.chatPermission = data.chatPermission;
      return Promise.resolve();
    },
    delete: ({
      where,
    }: {
      where: { userId_chatId: { userId: string; chatId: string } };
    }): Promise<void> => {
      memberships = memberships.filter(
        (m) =>
          !(m.userId === where.userId_chatId.userId && m.chatId === where.userId_chatId.chatId),
      );
      return Promise.resolve();
    },
    createMany: ({
      data,
    }: {
      data: { chatId: string; userId: string; chatPermission: Permission }[];
    }): Promise<void> => {
      for (const entry of data) memberships.push({ ...entry, hasDeleted: false });
      return Promise.resolve();
    },
  },
  message: {
    findFirst: ({
      where,
    }: {
      where: { chatId: string; senderId: { in: string[] } };
    }): Promise<{ senderId: string | null } | null> => {
      const latest = messages
        .filter((m) => m.chatId === where.chatId && where.senderId.in.includes(m.senderId ?? ''))
        .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      // eslint-disable-next-line unicorn/no-null
      return Promise.resolve(latest === undefined ? null : { senderId: latest.senderId });
    },
    create: ({
      data,
    }: {
      data: { chatId: string; contentVersions: { create: { payload: unknown }[] } };
    }): Promise<StoredMessage> => {
      const message: StoredMessage = {
        uuid: `message-${messages.length}`,
        chatId: data.chatId,
        // eslint-disable-next-line unicorn/no-null
        senderId: null,
        createdAt: new Date(),
        payload: data.contentVersions.create[0]?.payload,
      };
      messages.push(message);
      return Promise.resolve(message);
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ leaveChat, addParticipants }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `Name of ${uuid}`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const member = (userId: string, chatPermission: Permission): Membership => ({
  userId,
  chatId: CHAT_ID,
  hasDeleted: false,
  chatPermission,
});

const permissionOf = (userId: string): Permission | undefined =>
  memberships.find((m) => m.userId === userId)?.chatPermission;

const wrote = (senderId: string, minutesAgo: number): StoredMessage => ({
  uuid: `${senderId}-${minutesAgo}`,
  chatId: CHAT_ID,
  senderId,
  createdAt: new Date(Date.now() - minutesAgo * 60_000),
  payload: 'Hoi zäme',
});

beforeEach(() => {
  publish.mockClear();
  chatType = ChatType.GROUP;
  messages = [];
  memberships = [
    member('owner', ChatMembershipPermission.OWNER),
    member('anna', ChatMembershipPermission.MEMBER),
    member('ben', ChatMembershipPermission.MEMBER),
  ];
});

describe('leaving a group chat', () => {
  it('removes a member and leaves everybody else in place', async () => {
    await as('anna').leaveChat({ chatUuid: CHAT_ID });

    expect(memberships.map((m) => m.userId)).toEqual(['owner', 'ben']);
    expect(permissionOf('owner')).toBe(ChatMembershipPermission.OWNER);
  });

  it('tells the others in all three locales', async () => {
    await as('anna').leaveChat({ chatUuid: CHAT_ID });

    const payload = messages.at(-1)?.payload as StaticTranslationString;
    expect(formatMessageContent(payload, 'de')).toEqual(['Name of anna hat die Gruppe verlassen']);
    expect(formatMessageContent(payload, 'fr')).toEqual(['Name of anna a quitté le groupe']);
    expect(formatMessageContent(payload, 'en')).toEqual(['Name of anna left the group']);
  });

  it("ends the leaver's live subscription and shows the others the system message", async () => {
    await as('anna').leaveChat({ chatUuid: CHAT_ID });

    expect(publish).toHaveBeenCalledWith('anna', {
      type: 'membership_revoked',
      chatId: CHAT_ID,
      senderId: 'anna',
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new_message', chatId: CHAT_ID }),
    );
  });

  it('can be undone by adding the member again', async () => {
    await as('anna').leaveChat({ chatUuid: CHAT_ID });
    await as('owner').addParticipants({ chatId: CHAT_ID, participantIds: ['anna'] });

    expect(permissionOf('anna')).toBe(ChatMembershipPermission.MEMBER);
  });

  it('refuses somebody who is not a member', async () => {
    await expect(as('stranger').leaveChat({ chatUuid: CHAT_ID })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('the last owner leaving', () => {
  it('hands the chat to an admin before a member', async () => {
    memberships.push(member('admin', ChatMembershipPermission.ADMIN));
    messages.push(wrote('anna', 1));

    await as('owner').leaveChat({ chatUuid: CHAT_ID });

    expect(permissionOf('admin')).toBe(ChatMembershipPermission.OWNER);
    expect(permissionOf('anna')).toBe(ChatMembershipPermission.MEMBER);
  });

  it('hands the chat to the member who wrote last', async () => {
    messages.push(wrote('anna', 30), wrote('ben', 5));

    await as('owner').leaveChat({ chatUuid: CHAT_ID });

    expect(permissionOf('ben')).toBe(ChatMembershipPermission.OWNER);
    expect(permissionOf('anna')).toBe(ChatMembershipPermission.MEMBER);
    expect(permissionOf('owner')).toBeUndefined();
  });

  it('hands the chat over even when nobody has written yet', async () => {
    await as('owner').leaveChat({ chatUuid: CHAT_ID });

    const owners = memberships.filter((m) => m.chatPermission === ChatMembershipPermission.OWNER);
    expect(owners).toHaveLength(1);
  });

  it('hands nothing over while another owner stays', async () => {
    memberships.push(member('co-owner', ChatMembershipPermission.OWNER));

    await as('owner').leaveChat({ chatUuid: CHAT_ID });

    expect(permissionOf('anna')).toBe(ChatMembershipPermission.MEMBER);
    expect(permissionOf('ben')).toBe(ChatMembershipPermission.MEMBER);
  });

  it('is refused when only guests would remain, who cannot run the chat', async () => {
    memberships = [
      member('owner', ChatMembershipPermission.OWNER),
      member('guest', ChatMembershipPermission.GUEST),
    ];

    await expect(as('owner').leaveChat({ chatUuid: CHAT_ID })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
    expect(permissionOf('owner')).toBe(ChatMembershipPermission.OWNER);
  });
});

describe('chats that cannot be left', () => {
  it.each([
    ChatType.ONE_TO_ONE,
    ChatType.ANNOUNCEMENT,
    ChatType.COURSE_GROUP,
    ChatType.EMERGENCY,
    ChatType.SUPPORT_GROUP,
  ])('refuses to leave a %s chat', async (type) => {
    chatType = type;

    await expect(as('anna').leaveChat({ chatUuid: CHAT_ID })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(permissionOf('anna')).toBe(ChatMembershipPermission.MEMBER);
    expect(messages).toEqual([]);
  });
});
