jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));

const mockEnqueue = jest.fn().mockResolvedValue({ notificationId: 'n-1', deliveries: 2 });
jest.mock('@/lib/push/push-queue', () => ({
  enqueuePushNotification: (...args: unknown[]): unknown => mockEnqueue(...args),
}));

/** chat id -> the people who muted it */
let mutedMembers: Map<string, string[]>;
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    chatMembership: {
      findMany: ({
        where,
      }: {
        where: { chatId: string; userId: { in: string[] } };
      }): Promise<{ userId: string }[]> =>
        Promise.resolve(
          (mutedMembers.get(where.chatId) ?? [])
            .filter((userId) => where.userId.in.includes(userId))
            .map((userId) => ({ userId })),
        ),
    },
  },
}));

jest.mock('@/utils/get-app-short-name', () => ({
  getAppShortName: (): Promise<string> => Promise.resolve('conveniat27'),
}));

jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { createLogger: (): typeof logger => logger, __logger: logger };
});

import { sendNotification } from '@/lib/push/send-notification';

const lastQueuedPush = (): Record<string, unknown> =>
  (mockEnqueue.mock.calls as unknown[][]).at(-1)?.[0] as Record<string, unknown>;

describe('sendNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutedMembers = new Map();
  });

  it('queues a chat message titled with the chat and signed by its sender', async () => {
    await sendNotification('Wer hat die Blachen?', ['anna', 'ben'], 'chat-1', 'message-1', {
      kind: 'CHAT',
      chatName: 'Cevi Uster',
      senderName: 'Luca',
    });

    expect(lastQueuedPush()).toMatchObject({
      kind: 'CHAT',
      recipientUserIds: ['anna', 'ben'],
      title: 'Cevi Uster',
      body: 'Luca: Wer hat die Blachen?',
      url: 'https://example.test/app/chat/chat-1',
      messageId: 'message-1',
      ignoreIfUrlMatches: true,
    });
  });

  // The admin panel shows every push a person got; a chat message's text there would make
  // it a second copy of everybody's chats.
  it('logs where a chat message is instead of its text', async () => {
    await sendNotification('Privat', ['anna'], 'chat-1', 'message-1', { kind: 'CHAT' });

    expect(JSON.parse(lastQueuedPush()['logContent'] as string)).toEqual({
      type: 'chat_message',
      messageId: 'message-1',
      chatId: 'chat-1',
    });
  });

  it("falls back to this deployment's app name as the title", async () => {
    await sendNotification('Hallo', ['anna'], 'chat-1', undefined, { kind: 'SUPPORT' });

    expect(lastQueuedPush()['title']).toBe('conveniat27');
  });

  it('passes the siren channel on for an emergency', async () => {
    await sendNotification('Notfall', ['anna'], 'chat-1', undefined, {
      kind: 'EMERGENCY',
      notificationType: 'emergency',
    });

    expect(lastQueuedPush()).toMatchObject({ kind: 'EMERGENCY', notificationType: 'emergency' });
  });

  it('reports a failure to queue instead of throwing', async () => {
    mockEnqueue.mockRejectedValueOnce(new Error('connection refused'));

    await expect(
      sendNotification('Hallo', ['anna'], 'chat-1', undefined, { kind: 'CHAT' }),
    ).resolves.toEqual({ success: false, error: 'Failed to send notification' });
  });

  it('leaves out the people who muted the chat', async () => {
    mutedMembers.set('chat-1', ['ben']);
    mutedMembers.set('chat-2', ['anna']);

    await sendNotification('Znacht ist parat', ['anna', 'ben'], 'chat-1', 'message-1', {
      kind: 'CHAT',
    });

    expect(lastQueuedPush()['recipientUserIds']).toEqual(['anna']);
  });

  it('queues nothing when everybody muted the chat', async () => {
    mutedMembers.set('chat-1', ['anna', 'ben']);

    await sendNotification('Znacht ist parat', ['anna', 'ben'], 'chat-1', 'message-1', {
      kind: 'ANNOUNCEMENT',
    });

    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('reaches people in an emergency even when they muted the chat', async () => {
    mutedMembers.set('chat-1', ['anna', 'ben']);

    await sendNotification('Notfall', ['anna', 'ben'], 'chat-1', 'message-1', {
      kind: 'EMERGENCY',
      notificationType: 'emergency',
    });

    expect(lastQueuedPush()['recipientUserIds']).toEqual(['anna', 'ben']);
  });
});
