jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    // the groups the forum's rights read, none of them held here
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_FORUM_ZENTRALE: [],
  },
}));

let memberships: { userId: string; subscribed: boolean; admin?: boolean }[];
let threadSubscribers: string[];
let piket: string[];
/** the post the thread belongs to, as the database holds it */
let storedPost: { approvedAt: Date | null; hidden: boolean };

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    chatMembership: {
      findMany: ({
        where,
      }: {
        where: { subscribedAt?: unknown; userId?: { not: string }; chatPermission?: unknown };
      }): Promise<unknown[]> =>
        Promise.resolve(
          memberships
            .filter((m) => where.subscribedAt === undefined || m.subscribed)
            .filter((m) => where.chatPermission === undefined || m.admin === true)
            .filter((m) => m.userId !== where.userId?.not)
            .map((m) => ({ userId: m.userId })),
        ),
    },
    threadSubscription: {
      findMany: (): Promise<unknown[]> =>
        Promise.resolve(threadSubscribers.map((userId) => ({ userId }))),
    },
    forumPost: {
      findUnique: (): Promise<unknown> =>
        Promise.resolve({
          messageId: 'post',
          chatId: 'topic',
          approvedAt: storedPost.approvedAt,
          message: {
            senderId: 'noah',
            forumRemoval: storedPost.hidden ? { kind: 'HIDDEN' } : null,
          },
        }),
    },
    forumPostAssignment: {
      findMany: (): Promise<unknown[]> => Promise.resolve([]),
    },
  },
}));
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  getActivePiketMembers: (): Promise<unknown[]> =>
    Promise.resolve(piket.map((id) => ({ id, name: id }))),
}));
const sendNotification = jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve({}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...arguments_: unknown[]): unknown => sendNotification(...arguments_),
}));

import { pushForumThread, pushNewForumPost } from '@/features/chat/api/forum/forum-push';
import { PushNotificationKind } from '@/lib/prisma/enums';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** who got a push of which kind */
const delivered = (): Record<string, string[]> =>
  Object.fromEntries(
    sendNotification.mock.calls.map((call) => [
      (call[4] as { kind: string }).kind,
      call[1] as string[],
    ]),
  );

const post = {
  chatId: 'topic',
  postId: 'post',
  title: 'Toitoi in der Mitte ist voll',
  text: 'Seit gestern Abend voll.',
  topicName: 'Platz & Infrastruktur',
  senderId: 'noah',
  senderName: 'Noah v/o Biber',
};

beforeEach(() => {
  memberships = [
    { userId: 'noah', subscribed: true },
    { userId: 'sina', subscribed: true },
    { userId: 'mats', subscribed: false },
    { userId: 'lea', subscribed: true },
  ];
  threadSubscribers = ['noah', 'sina'];
  piket = ['lea'];
  storedPost = { approvedAt: new Date(), hidden: false };
  sendNotification.mockClear();
});

describe('forum pushes', () => {
  it('sends a member’s post to the piket as a report and to subscribers as a post', async () => {
    pushNewForumPost({ ...post, byTopicAdmin: false });
    await settle();

    expect(delivered()).toEqual({
      [PushNotificationKind.SUPPORT]: ['lea'],
      [PushNotificationKind.CHAT]: ['sina'],
    });
  });

  it('sends a Kernteam post to the whole audience', async () => {
    pushNewForumPost({ ...post, senderId: 'mira', byTopicAdmin: true });
    await settle();

    expect(delivered()).toEqual({
      [PushNotificationKind.ANNOUNCEMENT]: ['noah', 'sina', 'mats', 'lea'],
    });
  });

  it('sends a comment to the post’s subscribers and the piket, never to its author', async () => {
    pushForumThread({
      chatId: 'topic',
      postId: 'post',
      messageId: 'comment',
      postTitle: post.title,
      text: 'Das rechte geht noch.',
      actorId: 'sina',
      senderName: 'Sina v/o Rubin',
      includePiket: true,
    });
    await settle();

    expect(sendNotification).toHaveBeenCalledWith(
      'Das rechte geht noch.',
      ['noah', 'lea'],
      'topic',
      'comment',
      expect.objectContaining({ path: '/app/forum/post', chatName: post.title }),
    );
  });

  it.each([
    ['waits for approval', { approvedAt: null, hidden: false }],
    ['was hidden', { approvedAt: new Date(), hidden: true }],
  ])(
    'sends nothing about a post that %s to a subscriber who no longer sees it',
    async (_, state) => {
      storedPost = state;
      threadSubscribers = ['noah', 'sina'];
      pushForumThread({
        chatId: 'topic',
        postId: 'post',
        messageId: 'comment',
        postTitle: post.title,
        text: 'Wir schauen es an.',
        actorId: 'lea',
        includePiket: false,
      });
      await settle();

      // Noah wrote the post and still sees it; Sina, who only reads the topic, does not
      expect(sendNotification).toHaveBeenCalledWith(
        'Wir schauen es an.',
        ['noah'],
        'topic',
        'comment',
        expect.anything(),
      );
    },
  );
});
