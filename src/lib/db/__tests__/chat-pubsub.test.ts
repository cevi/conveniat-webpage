import * as chatRealtimeMetrics from '@/lib/chat-realtime-metrics';
import type { ChatRealtimeEvent } from '@/lib/db/chat-pubsub';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CHAT_DATABASE_URL: 'postgres://test',
    NODE_ENV: 'test',
  },
}));

const mockExecuteRaw = jest.fn().mockResolvedValue(1);
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]): Promise<number> =>
      mockExecuteRaw(strings, ...values) as Promise<number>,
  },
}));

// The factory must build the mocks itself: `jest.mock` is hoisted above any const
// it would otherwise close over, and chat-pubsub imports this module on load.
jest.mock('@/lib/chat-realtime-metrics', () => ({
  recordPubSubConnectionEvent: jest.fn(),
  recordPubSubNotification: jest.fn(),
  recordPubSubPublish: jest.fn(),
  setPubSubListening: jest.fn(),
  setPubSubSubscriberCount: jest.fn(),
}));

const mockMetrics = jest.mocked(chatRealtimeMetrics);

type NotificationHandler = (message: { channel: string; payload?: string }) => void;
const pgHandlers: Record<string, unknown> = {};

/** Number of upcoming `connect()` calls that should fail, for the outage tests. */
const pgConnectFailures = { remaining: 0 };
const pgClientsCreated = { count: 0 };

const connectMock = (): Promise<void> => {
  if (pgConnectFailures.remaining > 0) {
    pgConnectFailures.remaining -= 1;
    return Promise.reject(new Error('connection refused'));
  }
  return Promise.resolve();
};

jest.mock('pg', () => ({
  __esModule: true,
  default: {
    Client: class {
      public constructor() {
        pgClientsCreated.count += 1;
      }
      public connect = jest.fn().mockImplementation(connectMock);
      public query = jest.fn().mockResolvedValue(void 0);
      public end = jest.fn().mockResolvedValue(void 0);
      public on(event: string, callback: unknown): void {
        pgHandlers[event] = callback;
      }
    },
  },
}));

// Import after mocks so the singleton uses the mocked dependencies
import { chatPubSub } from '@/lib/db/chat-pubsub';

const simulateNotification = (event: Record<string, unknown>): void => {
  const handler = pgHandlers['notification'] as NotificationHandler;
  handler({ channel: 'chat_events', payload: JSON.stringify(event) });
};

const publishedEvent = (): ChatRealtimeEvent => {
  const calls = mockExecuteRaw.mock.calls as unknown[][];
  return JSON.parse(calls[0]?.[1] as string) as ChatRealtimeEvent;
};

describe('ChatPubSub channel routing', () => {
  beforeEach(() => {
    mockExecuteRaw.mockClear();
  });

  it('publishes to the chat channel by default', async () => {
    await chatPubSub.publish({ type: 'new_message', chatId: 'chat-1', senderId: 'user-1' });

    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    const payload = publishedEvent();
    expect(payload.chatId).toBe('chat-1');
    expect(payload.channel).toBeUndefined();
  });

  it('records the target channel when publishing with the string form', async () => {
    await chatPubSub.publish('user-2', { type: 'new_chat', chatId: 'chat-1', senderId: 'user-1' });

    const payload = publishedEvent();
    expect(payload.chatId).toBe('chat-1');
    expect(payload.channel).toBe('user-2');
  });

  it('does not record a redundant channel when it equals the chatId', async () => {
    await chatPubSub.publish('chat-1', { type: 'new_chat', chatId: 'chat-1', senderId: 'user-1' });

    const payload = publishedEvent();
    expect(payload.channel).toBeUndefined();
  });

  it('delivers events on the overridden channel instead of the chat channel', async () => {
    const chatListener = jest.fn();
    const personalListener = jest.fn();
    const allListener = jest.fn();
    const unsubscribeChat = await chatPubSub.subscribe('chat-1', chatListener);
    const unsubscribePersonal = await chatPubSub.subscribe('user-2', personalListener);
    const unsubscribeAll = await chatPubSub.subscribe('all', allListener);

    simulateNotification({
      type: 'new_chat',
      chatId: 'chat-1',
      senderId: 'user-1',
      channel: 'user-2',
    });

    expect(personalListener).toHaveBeenCalledTimes(1);
    const receivedEvent = (personalListener.mock.calls as unknown[][])[0]?.[0];
    expect(receivedEvent).toMatchObject({ type: 'new_chat', chatId: 'chat-1' });
    expect(chatListener).not.toHaveBeenCalled();
    expect(allListener).toHaveBeenCalledTimes(1);

    unsubscribeChat();
    unsubscribePersonal();
    unsubscribeAll();
  });

  it('delivers events on the chat channel when no channel override is set', async () => {
    const chatListener = jest.fn();
    const unsubscribeChat = await chatPubSub.subscribe('chat-1', chatListener);

    simulateNotification({ type: 'new_message', chatId: 'chat-1', senderId: 'user-1' });

    expect(chatListener).toHaveBeenCalledTimes(1);

    unsubscribeChat();
  });
});

const flushPendingPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const failCurrentConnection = (): void => {
  const handler = pgHandlers['error'] as (error: Error) => void;
  handler(new Error('connection terminated unexpectedly'));
};

describe('ChatPubSub LISTEN recovery', () => {
  it('keeps retrying until the LISTEN connection is back', async () => {
    const unsubscribe = await chatPubSub.subscribe('chat-recovery', jest.fn());
    const restored = jest.fn();
    const unsubscribeRestored = chatPubSub.onConnectionRestored(restored);

    jest.useFakeTimers();
    try {
      // The next reconnect attempt fails; without a retry loop the process would
      // stay detached from Postgres while every SSE stream looks healthy.
      pgConnectFailures.remaining = 1;
      const clientsBefore = pgClientsCreated.count;

      failCurrentConnection();

      jest.advanceTimersByTime(5000);
      await flushPendingPromises();
      expect(pgClientsCreated.count).toBe(clientsBefore + 1);
      expect(restored).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      await flushPendingPromises();
      expect(pgClientsCreated.count).toBe(clientsBefore + 2);
      expect(restored).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
      unsubscribeRestored();
      unsubscribe();
    }
  });
});

describe('ChatPubSub telemetry', () => {
  beforeEach(() => {
    mockMetrics.recordPubSubConnectionEvent.mockClear();
    mockMetrics.recordPubSubNotification.mockClear();
    mockMetrics.recordPubSubPublish.mockClear();
    mockMetrics.setPubSubListening.mockClear();
  });

  it('counts a successful publish', async () => {
    await chatPubSub.publish({ type: 'new_message', chatId: 'chat-t1', senderId: 'user-1' });

    expect(mockMetrics.recordPubSubPublish).toHaveBeenCalledWith('published');
  });

  it('counts a payload too large for pg_notify instead of publishing it', async () => {
    await chatPubSub.publish({
      type: 'new_message',
      chatId: 'chat-t2',
      senderId: 'user-1',
      message: {
        id: 'm1',
        createdAt: new Date(0),
        messagePayload: { text: 'x'.repeat(8000) },
        senderId: 'user-1',
        status: 'STORED',
        type: 'TEXT_MSG',
      },
    });

    expect(mockMetrics.recordPubSubPublish).toHaveBeenCalledWith('oversized');
  });

  it('counts notifications received from Postgres', async () => {
    const unsubscribe = await chatPubSub.subscribe('chat-t3', jest.fn());
    try {
      simulateNotification({ type: 'new_message', chatId: 'chat-t3', senderId: 'user-1' });

      expect(mockMetrics.recordPubSubNotification).toHaveBeenCalledWith('delivered');
    } finally {
      unsubscribe();
    }
  });

  it('reports the replica as no longer listening once the connection is recycled', async () => {
    const unsubscribe = await chatPubSub.subscribe('chat-t4', jest.fn());
    jest.useFakeTimers();
    try {
      failCurrentConnection();

      // The gauge is what makes a deaf replica visible; without it the process keeps
      // serving streams that deliver nothing and every other signal stays green.
      expect(mockMetrics.setPubSubListening).toHaveBeenCalledWith(false);
      expect(mockMetrics.recordPubSubConnectionEvent).toHaveBeenCalledWith(
        'recycled',
        'client_error',
      );
    } finally {
      jest.useRealTimers();
      unsubscribe();
    }
  });
});
