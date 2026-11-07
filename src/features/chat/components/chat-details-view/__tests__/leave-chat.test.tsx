/**
 * @jest-environment jsdom
 */

import { LeaveChatDialog } from '@/features/chat/components/chat-details-view/leave-chat';
import { createTestTrpc } from '@/trpc/test-trpc';
import { render, screen } from '@testing-library/react';

const cache: { details: { name: string; participants: [] } | undefined } = { details: undefined };

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/chat/hooks/use-chats', () => ({
  useChatDetail: (): { data: typeof cache.details } => ({ data: cache.details }),
}));
jest.mock('@/features/chat/hooks/use-leave-chat-mutation', () => ({
  useLeaveChatMutation: (): object => ({ isError: false, isPending: false, reset: jest.fn() }),
}));
jest.mock('@/features/chat/context/chat-id-context', () => ({ useChatId: (): string => 'b' }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

beforeEach(() => {
  cache.details = undefined;
});

/** renders the dialog for the signed-in user `user-me`, whose id the client already holds */
const renderDialog = (): void => {
  const { trpc, queryClient, wrapper } = createTestTrpc({ 'chat.user': () => 'user-me' });
  queryClient.setQueryData(trpc.chat.user.queryKey({}), 'user-me');
  render(<LeaveChatDialog open onOpenChange={jest.fn()} />, { wrapper });
};

describe('LeaveChatDialog', () => {
  it('names the group it is about to leave', () => {
    cache.details = { name: 'Züri 11', participants: [] };
    renderDialog();
    expect(screen.getByRole('alertdialog', { name: '«Züri 11» verlassen?' })).toBeTruthy();
  });

  it('asks without a name while the group is not loaded yet', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog', { name: 'Chat verlassen' })).toBeTruthy();
  });
});
