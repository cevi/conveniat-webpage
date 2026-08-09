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

type NotificationHandler = (message: { channel: string; payload?: string }) => void;
const pgHandlers: Record<string, unknown> = {};

jest.mock('pg', () => ({
  __esModule: true,
  default: {
    Client: class {
      public connect = jest.fn().mockResolvedValue(void 0);
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
