import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
const mockFindGlobal = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> => Promise.resolve({ findGlobal: mockFindGlobal }),
}));
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
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));

import { updateMessageContent } from '@/features/chat/api/mutations/update-message-content';
import { MessageType } from '@/lib/prisma/client';

interface StoredMessage {
  uuid: string;
  chatId: string;
  senderId: string | undefined;
  type: MessageType;
  createdAt: Date;
  contents: { revision: number; payload: Record<string, unknown> }[];
}

const CHAT_ID = 'emergency-chat';
const REPORTER = 'reporter';

const alertSettings = {
  questions: [
    {
      id: 'q-injured',
      key: 'injured',
      question: 'Ist jemand verletzt?',
      options: [
        { id: 'o-yes', option: 'Ja', nextQuestionKey: 'where' },
        { id: 'o-no', option: 'Nein' },
      ],
    },
    {
      id: 'q-where',
      key: 'where',
      question: 'Wo bist du?',
      options: [
        { id: 'o-hof', option: 'Beim Hof Cevi Uster' },
        { id: 'o-away', option: 'Ausserhalb des Lagerplatzes' },
      ],
    },
  ],
  finalResponseMessage: 'Die Sanität ist unterwegs.',
  emergencyPhoneNumber: '+41 44 000 00 00',
};

let messages: StoredMessage[];

/** Answers wait for each other the way `pg_advisory_xact_lock` makes them wait in Postgres. */
const locks = new Map<string, Promise<void>>();

/** Takes the lock for `key` until the transaction that `held` belongs to ends. */
const takeLock = async (held: (() => void)[], key: string): Promise<void> => {
  while (locks.has(key)) await locks.get(key);
  locks.set(
    key,
    new Promise<void>((resolve) => {
      held.push(() => {
        locks.delete(key);
        resolve();
      });
    }),
  );
};

const prisma = {
  $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
    const held: (() => void)[] = [];
    const tx = {
      ...prisma,
      $executeRaw: async (_sql: TemplateStringsArray, key: string): Promise<number> => {
        await takeLock(held, key);
        return 1;
      },
    };
    try {
      return await callback(tx);
    } finally {
      for (const release of held) release();
    }
  },
  chat: {
    // eslint-disable-next-line unicorn/no-null
    findUniqueOrThrow: (): Promise<unknown> => Promise.resolve({ archivedAt: null }),
    update: (): Promise<void> => Promise.resolve(),
  },
  message: {
    findUnique: async ({ where }: { where: { uuid: string } }): Promise<unknown> => {
      // yield, so that concurrent answers interleave wherever they are not serialised
      await Promise.resolve();
      const message = messages.find((m) => m.uuid === where.uuid);
      if (message === undefined) return;
      return {
        ...message,
        contentVersions: message.contents.toSorted((a, b) => b.revision - a.revision).slice(0, 1),
      };
    },
    create: ({
      data,
    }: {
      data: {
        chatId: string;
        senderId?: string;
        type: MessageType;
        contentVersions: { create: { payload: Record<string, unknown> } };
      };
    }): Promise<StoredMessage> => {
      const message: StoredMessage = {
        uuid: `00000000-0000-4000-8000-${String(messages.length).padStart(12, '0')}`,
        chatId: data.chatId,
        senderId: data.senderId,
        type: data.type,
        createdAt: new Date(),
        contents: [{ revision: 0, payload: data.contentVersions.create.payload }],
      };
      messages.push(message);
      return Promise.resolve(message);
    },
  },
  messageContent: {
    create: ({
      data,
    }: {
      data: { messageId: string; revision: number; payload: Record<string, unknown> };
    }): Promise<void> => {
      messages
        .find((m) => m.uuid === data.messageId)
        ?.contents.push({ revision: data.revision, payload: data.payload });
      return Promise.resolve();
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ updateMessageContent }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `Name of ${uuid}`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const seed = (
  type: MessageType,
  payload: Record<string, unknown>,
  senderId: string | undefined = REPORTER,
): string => {
  const uuid = `00000000-0000-4000-8000-${String(messages.length).padStart(12, '0')}`;
  messages.push({
    uuid,
    chatId: CHAT_ID,
    senderId,
    type,
    createdAt: new Date(),
    contents: [{ revision: 0, payload }],
  });
  return uuid;
};

/** The first question, stored the way `emergency.newAlert` writes it. */
const seedFirstQuestion = (): string => {
  const [first] = alertSettings.questions;
  return seed(MessageType.ALERT_QUESTION, {
    question: first?.question,
    options: first?.options.map((o) => ({ id: o.id, option: o.option })),
    questionRefId: first?.id,
  });
};

const latestPayload = (uuid: string): Record<string, unknown> | undefined =>
  messages.find((m) => m.uuid === uuid)?.contents.at(-1)?.payload;

const finalResponses = (): StoredMessage[] =>
  messages.filter((m) => m.type === MessageType.ALERT_RESPONSE);

beforeEach(() => {
  messages = [];
  locks.clear();
  mockFindGlobal.mockResolvedValue(alertSettings);
});

describe('answering an emergency alert', () => {
  it('walks from the first question through a follow-up question to the final response', async () => {
    const firstQuestion = seedFirstQuestion();

    await as(REPORTER).updateMessageContent({
      messageId: firstQuestion,
      content: { selectedOption: 'Ja', selectedOptionId: 'o-yes' },
    });

    expect(latestPayload(firstQuestion)).toMatchObject({
      question: 'Ist jemand verletzt?',
      selectedOption: 'Ja',
    });
    const secondQuestion = messages.at(-1);
    expect(secondQuestion?.type).toBe(MessageType.ALERT_QUESTION);
    expect(secondQuestion?.contents[0]?.payload).toMatchObject({
      question: 'Wo bist du?',
      questionRefId: 'q-where',
    });

    await as(REPORTER).updateMessageContent({
      messageId: secondQuestion?.uuid ?? '',
      content: { selectedOption: 'Beim Hof Cevi Uster', selectedOptionId: 'o-hof' },
    });

    const response = messages.at(-1);
    expect(response?.type).toBe(MessageType.ALERT_RESPONSE);
    expect(response?.senderId).toBeUndefined();
    expect(response?.contents[0]?.payload).toEqual({
      message: 'Die Sanität ist unterwegs.',
      phoneNumber: '+41 44 000 00 00',
    });
  });

  it('accepts the whole payload older app versions send back, but stores only the answer', async () => {
    const question = seedFirstQuestion();

    await as(REPORTER).updateMessageContent({
      messageId: question,
      content: {
        question: 'Ruf mich an',
        options: [{ id: 'o-no', option: 'Nein' }],
        questionRefId: 'q-where',
        selectedOption: 'Nein',
        selectedOptionId: 'o-no',
      } as { selectedOption: string },
    });

    expect(latestPayload(question)).toMatchObject({
      question: 'Ist jemand verletzt?',
      questionRefId: 'q-injured',
      selectedOption: 'Nein',
    });
    expect(messages.at(-1)?.type).toBe(MessageType.ALERT_RESPONSE);
  });

  it('rejects a second answer to the same question and sends one follow-up', async () => {
    const question = seedFirstQuestion();
    const answer = { messageId: question, content: { selectedOption: 'Nein' } };

    await as(REPORTER).updateMessageContent(answer);
    await expect(as(REPORTER).updateMessageContent(answer)).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    expect(finalResponses()).toHaveLength(1);
  });

  it('sends one follow-up when the same question is answered twice at once', async () => {
    const question = seedFirstQuestion();
    const answer = { messageId: question, content: { selectedOption: 'Nein' } };

    const results = await Promise.allSettled([
      as(REPORTER).updateMessageContent(answer),
      as(REPORTER).updateMessageContent(answer),
    ]);

    expect(results.map((r) => r.status).toSorted()).toEqual(['fulfilled', 'rejected']);
    expect(finalResponses()).toHaveLength(1);
  });
});

describe('what a participant cannot edit', () => {
  it('rejects edits to a system message, such as turning it into the emergency banner', async () => {
    const systemMessage = seed(MessageType.SYSTEM_MSG, { text: 'Anna hat den Chat erstellt' });

    await expect(
      as(REPORTER).updateMessageContent({
        messageId: systemMessage,
        content: { system_msg_type: 'emergency_alert', selectedOption: 'x' } as {
          selectedOption: string;
        },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(latestPayload(systemMessage)).toEqual({ text: 'Anna hat den Chat erstellt' });
  });

  it('rejects edits to a text message', async () => {
    const text = seed(MessageType.TEXT_MSG, { text: 'Hoi zäme' });

    await expect(
      as(REPORTER).updateMessageContent({
        messageId: text,
        content: { selectedOption: 'Ja' },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it("rejects answering someone else's alert question", async () => {
    const question = seedFirstQuestion();

    await expect(
      as('piket-member').updateMessageContent({
        messageId: question,
        content: { selectedOption: 'Ja' },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(messages).toHaveLength(1);
  });

  it('rejects an answer that is not one of the options', async () => {
    const question = seedFirstQuestion();

    await expect(
      as(REPORTER).updateMessageContent({
        messageId: question,
        content: { selectedOption: 'Ruf +41 79 000 00 00 an' },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(latestPayload(question)?.['selectedOption']).toBeUndefined();
  });

  it('rejects an oversized answer before it reaches the database', async () => {
    const question = seedFirstQuestion();

    await expect(
      as(REPORTER).updateMessageContent({
        messageId: question,
        content: { selectedOption: 'Ja'.repeat(1000) },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
