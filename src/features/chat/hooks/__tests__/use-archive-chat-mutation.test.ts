/**
 * @jest-environment jsdom
 */

import { toast } from '@/components/ui/toast';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/components/ui/toast', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useArchiveChatMutation', () => {
  it('brings the chat back, says the delete failed and sends it again on "Nochmals"', async () => {
    const archiveChat = jest.fn().mockRejectedValueOnce(new Error('offline'));
    const { trpc, queryClient, wrapper } = createTestTrpc({ 'chat.archiveChat': archiveChat });
    const previousChats = [{ id: 'chat-avp-zueri-11' }];
    queryClient.setQueryData(trpc.chat.chats.queryKey({}), previousChats as never);
    const { result } = renderHook(() => useArchiveChatMutation(), { wrapper });

    act(() => {
      result.current.mutate({ chatUuid: 'chat-avp-zueri-11' });
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(queryClient.getQueryData(trpc.chat.chats.queryKey({}))).toEqual(previousChats);
    const [[message, { action }]] = jest.mocked(toast.error).mock.calls as unknown as [
      [string, { action: { label: string; onClick: () => void } }],
    ];
    expect(message).toBe('Chat konnte nicht gelöscht werden.');
    expect(action.label).toBe('Nochmals');

    archiveChat.mockImplementationOnce(async () => {});
    act(() => {
      action.onClick();
    });
    await waitFor(() => expect(archiveChat).toHaveBeenCalledTimes(2));
    expect(archiveChat).toHaveBeenLastCalledWith({ chatUuid: 'chat-avp-zueri-11' });
  });
});
