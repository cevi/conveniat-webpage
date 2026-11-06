/**
 * @jest-environment jsdom
 */

import { LeaveChatDialog } from '@/features/chat/components/chat-details-view/leave-chat';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render, screen } from '@testing-library/react';

const mutate = jest.fn();

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/chat/hooks/use-chats', () => ({
  useChatDetail: (): { data: { name: string; participants: [] } } => ({
    data: { name: 'Züri 11', participants: [] },
  }),
}));
jest.mock('@/features/chat/hooks/use-leave-chat-mutation', () => ({
  useLeaveChatMutation: (): object => ({
    mutate,
    isError: false,
    isPending: false,
    reset: jest.fn(),
  }),
}));
jest.mock('@/lib/prisma', () => ({ ChatMembershipPermission: { OWNER: 'OWNER' } }));
jest.mock('@/features/chat/context/chat-id-context', () => ({ useChatId: (): string => 'b' }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

/** renders the dialog for the signed-in user `user-me`, whose id the client already holds */
const renderDialog = (): void => {
  const { trpc, queryClient, wrapper } = createTestTrpc({ 'chat.user': () => 'user-me' });
  queryClient.setQueryData(trpc.chat.user.queryKey({}), 'user-me');
  render(<LeaveChatDialog open onOpenChange={jest.fn()} />, { wrapper });
};

describe('LeaveChatDialog', () => {
  it('leaves the chat with the button that says Verlassen', () => {
    renderDialog();
    screen.getByRole('button', { name: 'Verlassen' }).click();
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'b' }, expect.anything());
  });
});
