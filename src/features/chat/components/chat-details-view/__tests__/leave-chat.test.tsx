/**
 * @jest-environment jsdom
 */

import { LeaveChatDialog } from '@/features/chat/components/chat-details-view/leave-chat';
import { render, screen } from '@testing-library/react';

const cache: { details: { name: string; participants: [] } | undefined } = { details: undefined };

jest.mock('@/trpc/client', () => ({
  trpc: { chat: { user: { useQuery: (): { data: string } => ({ data: 'user-me' }) } } },
}));
jest.mock('@/features/chat/hooks/use-chats', () => ({
  useChatDetail: (): { data: typeof cache.details } => ({ data: cache.details }),
}));
jest.mock('@/features/chat/hooks/use-leave-chat-mutation', () => ({
  useLeaveChatMutation: (): object => ({ isError: false, isPending: false, reset: jest.fn() }),
}));
jest.mock('@/lib/prisma', () => ({ ChatMembershipPermission: { OWNER: 'OWNER' } }));
jest.mock('@/features/chat/context/chat-id-context', () => ({ useChatId: (): string => 'b' }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

beforeEach(() => {
  cache.details = undefined;
});

describe('LeaveChatDialog', () => {
  it('names the group it is about to leave', () => {
    cache.details = { name: 'Züri 11', participants: [] };
    render(<LeaveChatDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByRole('alertdialog', { name: '«Züri 11» verlassen?' })).toBeTruthy();
  });

  it('asks without a name while the group is not loaded yet', () => {
    render(<LeaveChatDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByRole('alertdialog', { name: 'Chat verlassen' })).toBeTruthy();
  });
});
