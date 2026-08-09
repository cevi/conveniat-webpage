/**
 * @jest-environment jsdom
 */

import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { getOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import { ChatStatus } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import { renderHook } from '@testing-library/react';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums
jest.mock('@/lib/prisma/client', () => ({
  ChatType: { ONE_TO_ONE: 'ONE_TO_ONE', GROUP: 'GROUP' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { TEXT_MSG: 'TEXT_MSG', IMAGE_MSG: 'IMAGE_MSG' },
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    chat: {
      user: { useQuery: jest.fn() },
      sendMessage: { useMutation: jest.fn() },
    },
  },
}));

jest.mock('@/features/chat/context/chat-actions-context', () => ({
  useChatActions: (): { cancelQuote: () => void } => ({ cancelQuote: jest.fn() }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const CHAT_ID = 'chat-1';

const buildExistingChat = (): ChatWithMessagePreview => ({
  id: CHAT_ID,
  name: 'Test Chat',
  status: ChatStatus.OPEN,
  chatType: 'ONE_TO_ONE',
  lastMessage: {
    id: 'msg-0',
    senderId: 'someone-else',
    messagePreview: 'previous message',
    createdAt: new Date(),
    status: 'STORED',
  },
  lastUpdate: new Date(),
  unreadCount: 0,
  messageCount: 1,
  userChatPermission: 'MEMBER',
});

/**
 * Runs the send mutation's `onMutate` handler and returns the chat overview
 * entry produced by the optimistic update.
 */
const runOptimisticUpdate = async (content: string): Promise<ChatWithMessagePreview> => {
  let updatedChats: ChatWithMessagePreview[] = [];

  (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
    chat: {
      chatDetails: { cancel: jest.fn(), getData: jest.fn(), setData: jest.fn() },
      infiniteMessages: {
        cancel: jest.fn(),
        getInfiniteData: jest.fn(),
        setInfiniteData: jest.fn(),
      },
      chats: {
        setData: (
          _input: unknown,
          updater: (old: ChatWithMessagePreview[]) => ChatWithMessagePreview[],
        ): void => {
          updatedChats = updater([buildExistingChat()]);
        },
      },
    },
  });
  (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({ data: 'user-1' });

  let onMutate: ((input: { chatId: string; content: string }) => Promise<unknown>) | undefined;
  (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockImplementation(
    (options: { onMutate: (input: { chatId: string; content: string }) => Promise<unknown> }) => {
      onMutate = options.onMutate;
      return {};
    },
  );

  renderHook(() => useMessageSend());
  await onMutate?.({ chatId: CHAT_ID, content });

  const chat = updatedChats[0];
  if (chat === undefined) throw new Error('optimistic update did not produce a chat');
  return chat;
};

interface SendMutationOptions {
  onMutate: (input: Record<string, unknown>) => Promise<unknown>;
  onError: (error: Error, input: Record<string, unknown>, context: unknown) => void;
}

/**
 * Renders the hook with stubbed caches and returns the mutation handlers it registered.
 */
const renderSendMutation = (): SendMutationOptions => {
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
    chat: {
      chatDetails: { cancel: jest.fn(), getData: jest.fn(), setData: jest.fn() },
      infiniteMessages: {
        cancel: jest.fn(),
        getInfiniteData: jest.fn(),
        setInfiniteData: jest.fn(),
      },
      chats: { setData: jest.fn() },
    },
  });
  (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({ data: 'user-1' });

  let options: SendMutationOptions | undefined;
  (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockImplementation(
    (mutationOptions: SendMutationOptions) => {
      options = mutationOptions;
      return {};
    },
  );

  renderHook(() => useMessageSend());
  if (options === undefined) throw new Error('send mutation was not registered');
  return options;
};

describe('useMessageSend optimistic chat overview update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('previews the plain message text without JSON quoting', async () => {
    const chat = await runOptimisticUpdate('Test');

    expect(chat.lastMessage?.messagePreview).toBe('Test');
  });

  it('does not escape quotes or backslashes contained in the message', async () => {
    const chat = await runOptimisticUpdate(String.raw`He said "hi" \o/`);

    expect(chat.lastMessage?.messagePreview).toBe(String.raw`He said "hi" \o/`);
  });

  it('trims surrounding whitespace like the sent message does', async () => {
    const chat = await runOptimisticUpdate('  padded  ');

    expect(chat.lastMessage?.messagePreview).toBe('padded');
  });
});

/**
 * Sending is replayed from the offline outbox, so the id the client picks has to survive
 * the whole round trip: optimistic bubble -> request -> outbox entry -> replayed request.
 * If it did not, the server could not tell a replay apart from a new message and would
 * store the message twice.
 */
describe('useMessageSend message identity', () => {
  const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('uses the id sent to the server for the optimistic message', async () => {
    const { onMutate } = renderSendMutation();
    const context = (await onMutate({
      chatId: CHAT_ID,
      content: 'queued while offline',
      messageId: MESSAGE_ID,
    })) as { optimisticMessageId?: string };

    expect(context.optimisticMessageId).toBe(MESSAGE_ID);
  });

  it('queues a dropped send under that same id so the replay is recognised', async () => {
    const { onMutate, onError } = renderSendMutation();
    const context = await onMutate({
      chatId: CHAT_ID,
      content: 'queued while offline',
      messageId: MESSAGE_ID,
    });

    onError(
      new Error('Failed to fetch'),
      { chatId: CHAT_ID, content: 'queued while offline', timestamp: new Date() },
      context,
    );

    expect(getOfflineOutbox()).toStrictEqual([
      expect.objectContaining({ type: 'MESSAGE', id: MESSAGE_ID, chatId: CHAT_ID }),
    ]);
  });
});
