/**
 * @jest-environment jsdom
 */

import { ChatSplitView } from '@/features/chat/components/chat-split-view';
import { useListIsPrevious } from '@/features/chat/context/list-is-previous-context';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const navigation = { pathname: '/de/app/chat' };
jest.mock('next/navigation', () => ({ usePathname: (): string => navigation.pathname }));
jest.mock('@/features/chat/context/chat-id-context', () => ({
  ChatIdProvider: ({ children }: { children: React.ReactNode }): React.ReactNode => children,
}));

const Probe: React.FC = () => <span>{useListIsPrevious() ? 'list before' : 'no list before'}</span>;

const view = (): React.ReactElement => (
  <ChatSplitView list={undefined} inAppDesign>
    <Probe />
  </ChatSplitView>
);

describe('ChatSplitView', () => {
  it('knows the list is the previous entry for a chat opened from it', () => {
    navigation.pathname = '/de/app/chat';
    const { rerender } = render(view());
    expect(screen.getByText('no list before')).toBeInTheDocument();

    navigation.pathname = '/de/app/chat/chat-1';
    rerender(view());

    expect(screen.getByText('list before')).toBeInTheDocument();
  });

  it('does not take a chat opened directly for one opened from the list', () => {
    navigation.pathname = '/de/app/chat/chat-1';
    render(view());

    expect(screen.getByText('no list before')).toBeInTheDocument();
  });

  it('forgets the list once the user moves on from the chat', () => {
    navigation.pathname = '/de/app/chat';
    const { rerender } = render(view());
    navigation.pathname = '/de/app/chat/chat-1';
    rerender(view());

    navigation.pathname = '/de/app/chat/chat-1/details';
    rerender(view());

    expect(screen.getByText('no list before')).toBeInTheDocument();
  });
});
