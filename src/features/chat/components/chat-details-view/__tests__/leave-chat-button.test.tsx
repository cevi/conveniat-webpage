/**
 * @jest-environment jsdom
 */

import { LeaveChatDialog } from '@/features/chat/components/chat-details-view/leave-chat';
import { render, screen } from '@testing-library/react';

const mutate = jest.fn();

jest.mock('@/trpc/client', () => ({
  trpc: { chat: { user: { useQuery: (): { data: string } => ({ data: 'user-me' }) } } },
}));
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

describe('LeaveChatDialog', () => {
  it('leaves the chat with the button that says Verlassen', () => {
    render(<LeaveChatDialog open onOpenChange={jest.fn()} />);
    screen.getByRole('button', { name: 'Verlassen' }).click();
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'b' }, expect.anything());
  });
});
