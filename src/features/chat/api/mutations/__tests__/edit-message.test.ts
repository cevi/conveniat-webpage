import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
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
jest.mock('@/lib/db/redis', () => ({
  // every rate limit counter at its first call
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));
// the chat takes messages; what it refuses is covered with `createMessage`
jest.mock('@/features/chat/api/checks/assert-can-write-in-chat', () => ({
  assertWriteAbilities: (): Promise<void> => Promise.resolve(),
}));

import { editMessage } from '@/features/chat/api/mutations/edit-message';

const CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const MESSAGE_ID = '0190a5b2-0000-7000-8000-0000000000aa';
const HOUR = 60 * 60 * 1000;

interface Revision {
  revision: number;
  payload: Record<string, unknown>;
}

let sentAt: Date;
let revisions: Revision[];
let editedAt: Date | null;

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  message: {
    findFirst: (): Promise<unknown> =>
      Promise.resolve({
        uuid: MESSAGE_ID,
        chatId: CHAT_ID,
        type: 'TEXT_MSG',
        senderId: 'anna',
        parentId: null,
        createdAt: sentAt,
        deletedAt: null,
        editedAt,
        forumPost: null,
        chat: { type: 'GROUP' },
        contentVersions: revisions.slice(-1),
      }),
    update: ({ data }: { data: { editedAt: Date } }): Promise<void> => {
      editedAt = data.editedAt;
      return Promise.resolve();
    },
  },
  messageContent: {
    create: ({ data }: { data: Revision }): Promise<void> => {
      revisions.push({ revision: data.revision, payload: data.payload });
      return Promise.resolve();
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ editMessage }));
const anna = createCaller({
  user: { uuid: 'anna', group_ids: [], name: 'Anna Muster', email: 'anna@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

beforeEach(() => {
  revisions = [
    { revision: 1, payload: { text: 'Treffpunkt um 8 beim Hof Cevi Uster', quotedMessageId: 'q' } },
  ];
  editedAt = null;
});

describe('editing a message', () => {
  it('writes the new text as a new revision within a day, and marks the message edited', async () => {
    sentAt = new Date(Date.now() - 23 * HOUR);

    const result = await anna.editMessage({
      messageId: MESSAGE_ID,
      text: 'Treffpunkt um 9 beim Hof Cevi Uster',
    });

    // the earlier text stays, and so does the rest of the payload
    expect(revisions).toEqual([
      {
        revision: 1,
        payload: { text: 'Treffpunkt um 8 beim Hof Cevi Uster', quotedMessageId: 'q' },
      },
      {
        revision: 2,
        payload: { text: 'Treffpunkt um 9 beim Hof Cevi Uster', quotedMessageId: 'q' },
      },
    ]);
    expect(editedAt).toBeInstanceOf(Date);
    expect(result.editedAt).toEqual(editedAt);
  });

  it('refuses an edit more than a day after sending', async () => {
    sentAt = new Date(Date.now() - 25 * HOUR);

    await expect(
      anna.editMessage({ messageId: MESSAGE_ID, text: 'Treffpunkt um 9' }),
    ).rejects.toMatchObject({ reason: 'editWindowOver' });
    expect(revisions).toHaveLength(1);
    expect(editedAt).toBeNull();
  });
});
