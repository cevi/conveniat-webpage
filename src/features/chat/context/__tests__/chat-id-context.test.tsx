/**
 * @jest-environment jsdom
 */

import {
  ChatIdProvider,
  isOpenChatPathname,
  OpeningChatProvider,
  useChatId,
  useOpeningChat,
} from '@/features/chat/context/chat-id-context';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import { startTransition } from 'react';

const navigation = { pathname: '/de/app/chat/a' };
jest.mock('next/navigation', () => ({ usePathname: (): string => navigation.pathname }));

beforeEach(() => {
  navigation.pathname = '/de/app/chat/a';
});

const OpenChat: React.FC = () => <span data-testid="open-chat">{useChatId()}</span>;

/** Taps chat b the way a Link does: the router's navigation runs in a transition of its own. */
const TapChatB: React.FC<{ navigation: Promise<void> }> = ({ navigation: routerNavigation }) => {
  const openingChat = useOpeningChat();
  return (
    <button
      type="button"
      onClick={() => {
        openingChat?.showOpeningChat('b');
        startTransition(async () => {
          await routerNavigation;
        });
      }}
    >
      b
    </button>
  );
};

describe('isOpenChatPathname', () => {
  it('knows the screen of an open chat', () => {
    expect(isOpenChatPathname('/de/app/chat/a')).toBe(true);
    expect(isOpenChatPathname('/app/chat/a/')).toBe(true);
  });

  it('leaves out the overview, the steps under a chat and the static routes', () => {
    expect(isOpenChatPathname('/de/app/chat')).toBe(false);
    expect(isOpenChatPathname('/de/app/chat/')).toBe(false);
    expect(isOpenChatPathname('/de/app/chat/new')).toBe(false);
    expect(isOpenChatPathname('/de/app/chat/new/group')).toBe(false);
    expect(isOpenChatPathname('/de/app/chat/a/details')).toBe(false);
    expect(isOpenChatPathname('/de/app/chat/new-chat-with-user/token')).toBe(false);
  });
});

describe('OpeningChatProvider', () => {
  it('shows the tapped chat until the router has navigated', async () => {
    const { promise: routerNavigation, resolve: finishNavigation } = Promise.withResolvers<void>();
    render(
      <OpeningChatProvider>
        <ChatIdProvider>
          <OpenChat />
          <TapChatB navigation={routerNavigation} />
        </ChatIdProvider>
      </OpeningChatProvider>,
    );
    expect(screen.getByTestId('open-chat').textContent).toBe('a');

    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('open-chat').textContent).toBe('b');

    // once the navigation is over the URL names the open chat again, here one that never changed
    await act(async () => {
      finishNavigation();
      await routerNavigation;
    });
    expect(screen.getByTestId('open-chat').textContent).toBe('a');
  });

  it('keeps the chat a sheet names beside an open chat', () => {
    render(
      <OpeningChatProvider>
        <ChatIdProvider chatId="b">
          <OpenChat />
        </ChatIdProvider>
      </OpeningChatProvider>,
    );
    expect(screen.getByTestId('open-chat').textContent).toBe('b');
  });

  it('keeps the chat a sheet names, away from the chat route', () => {
    navigation.pathname = '/de/app/chat';
    render(
      <OpeningChatProvider>
        <ChatIdProvider chatId="c">
          <OpenChat />
        </ChatIdProvider>
      </OpeningChatProvider>,
    );
    expect(screen.getByTestId('open-chat').textContent).toBe('c');
  });
});
