/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useEditMessage } from '@/features/chat/hooks/use-edit-message';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const noAnswer = (): void => {};

const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

const original = {
  id: MESSAGE_ID,
  createdAt: new Date(2027, 6, 26, 18, 42),
  messagePayload: { text: 'Treffpunkt 07:30', quotedMessageId: 'quoted-1' },
  senderId: 'sender-1',
  status: 'STORED',
  type: 'TEXT_MSG',
  parentId: 'post-1',
} as unknown as ChatMessage;

const setup = (
  editMessage: (input: unknown) => unknown,
): ReturnType<typeof createTestTrpc> & { read: () => ChatMessage | undefined } => {
  const testTrpc = createTestTrpc({ 'chat.editMessage': editMessage });
  const key = testTrpc.trpc.chat.infiniteMessages.infiniteQueryKey({
    chatId: 'chat-1',
    limit: CHAT_PAGE_SIZE,
    parentId: 'post-1',
  });
  testTrpc.queryClient.setQueryData(key, {
    pages: [{ items: [original], nextCursor: undefined }],
    pageParams: [null],
  });
  const read = (): ChatMessage | undefined =>
    testTrpc.queryClient.getQueryData(key)?.pages[0]?.items[0];
  return { ...testTrpc, read };
};

describe('useEditMessage', () => {
  it('shows the new text and "Bearbeitet" at once, and keeps the rest of the payload', async () => {
    let answer: (value: { editedAt: Date }) => void = noAnswer;
    const { wrapper, read } = setup(
      () => new Promise<{ editedAt: Date }>((resolve) => (answer = resolve)),
    );
    const { result } = renderHook(() => useEditMessage({ chatId: 'chat-1', parentId: 'post-1' }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ messageId: MESSAGE_ID, text: 'Treffpunkt 07:45' });
    });

    await waitFor(() =>
      expect(read()?.messagePayload).toEqual({
        text: 'Treffpunkt 07:45',
        quotedMessageId: 'quoted-1',
      }),
    );
    expect(read()?.editedAt).toBeInstanceOf(Date);

    const editedAt = new Date(2027, 6, 26, 18, 50);
    act(() => answer({ editedAt }));
    await waitFor(() => expect(read()?.editedAt?.getTime()).toBe(editedAt.getTime()));
  });

  it('puts the old text back when the server refuses', async () => {
    const { wrapper, read } = setup(() => {
      throw new Error('editWindowOver');
    });
    const { result } = renderHook(() => useEditMessage({ chatId: 'chat-1', parentId: 'post-1' }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ messageId: MESSAGE_ID, text: 'Treffpunkt 07:45' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(read()).toEqual(original);
  });
});
