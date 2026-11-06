/**
 * @jest-environment jsdom
 */

import type { ChatDetails } from '@/features/chat/api/types';
import { ChatHeader } from '@/features/chat/components/chat-view/chat-header';
import { ListIsPreviousContext } from '@/features/chat/context/list-is-previous-context';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import type { RenderResult } from '@testing-library/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const CHAT_ID = 'chat-1';
const ME = 'user-me';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/lib/prisma/client', () => ({
  ChatType: {
    ONE_TO_ONE: 'ONE_TO_ONE',
    GROUP: 'GROUP',
    EMERGENCY: 'EMERGENCY',
    SUPPORT_GROUP: 'SUPPORT_GROUP',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
    COURSE_GROUP: 'COURSE_GROUP',
  },
}));
jest.mock('@/features/chat/context/chat-id-context', () => ({ useChatId: (): string => CHAT_ID }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: (): { back: jest.Mock } => ({ back: mockBack }),
}));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));

const listEntry = (entry: Partial<ChatWithMessagePreview>): ChatWithMessagePreview =>
  ({ id: CHAT_ID, name: '', chatType: 'ONE_TO_ONE', ...entry }) as ChatWithMessagePreview;

const participant = (
  id: string,
  name: string,
  pictureUrl?: string,
): ChatDetails['participants'][number] =>
  ({ id, name, pictureUrl, isOnline: false }) as ChatDetails['participants'][number];

const detailsLink = (): HTMLElement => screen.getByRole('link', { name: /, Chat-Details öffnen$/ });

const backLink = (): HTMLElement => screen.getByRole('link', { name: 'Zurück zu den Chats' });

let testTrpc: TestTrpc;

/**
 * Renders the header for the signed-in user, with the chat list the phone kept, if any, and
 * the chat's details still on their way from the server.
 */
const renderHeader = (
  list?: ChatWithMessagePreview[],
  ui: React.ReactElement = <ChatHeader />,
): RenderResult => {
  // the details stay pending until a test sets them
  testTrpc = createTestTrpc({ 'chat.chatDetails': () => new Promise(() => {}) });
  const { trpc, queryClient, wrapper } = testTrpc;
  queryClient.setQueryData(trpc.chat.user.queryKey({}), ME);
  if (list !== undefined) queryClient.setQueryData(trpc.chat.chats.queryKey({}), list);
  return render(ui, { wrapper });
};

/** the details of the chat arriving from the server */
const detailsArrive = async (details: ChatDetails): Promise<void> => {
  const { trpc, queryClient } = testTrpc;
  queryClient.setQueryData(trpc.chat.chatDetails.queryKey({ chatId: CHAT_ID }), details);
  // the query tells the header on the next tick
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  mockBack.mockClear();
});

describe('ChatHeader', () => {
  it('names and pictures a private chat from the chat list before its details are loaded', () => {
    const { container } = renderHeader([
      listEntry({
        name: 'Anna Muster v/o Fuchs',
        partner: { userId: 'user-anna', pictureUrl: '/pictures/anna.webp' },
      }),
    ]);

    expect(detailsLink()).toHaveAccessibleName('Anna Muster v/o Fuchs, Chat-Details öffnen');
    expect(container.querySelector('img')).toHaveAttribute('src', '/pictures/anna.webp');
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('shows the same name and picture once the details are there', async () => {
    const { container } = renderHeader([
      listEntry({
        name: 'Anna Muster v/o Fuchs',
        partner: { userId: 'user-anna', pictureUrl: '/pictures/anna.webp' },
      }),
    ]);
    const before = detailsLink().innerHTML;

    await detailsArrive({
      id: CHAT_ID,
      name: 'Anna Muster v/o Fuchs',
      type: 'ONE_TO_ONE',
      participants: [
        participant(ME, 'Max Muster v/o Igel'),
        participant('user-anna', 'Anna Muster v/o Fuchs', '/pictures/anna.webp'),
      ],
    } as ChatDetails);

    expect(detailsLink().innerHTML).toBe(before);
    expect(container.querySelector('img')).toHaveAttribute('src', '/pictures/anna.webp');
  });

  it('names a group from the chat list and adds its members once the details are there', async () => {
    renderHeader([listEntry({ name: 'Hofleitung Züri 11', chatType: 'GROUP' })]);

    expect(detailsLink()).toHaveAccessibleName('Hofleitung Züri 11, Chat-Details öffnen');
    expect(screen.queryByText(/und du$/)).toBeNull();

    await detailsArrive({
      id: CHAT_ID,
      name: 'Hofleitung Züri 11',
      type: 'GROUP',
      participants: [
        participant(ME, 'Max Muster v/o Igel'),
        participant('user-anna', 'Anna Muster v/o Fuchs'),
        participant('user-ben', 'Ben Beispiel v/o Dachs'),
      ],
    } as ChatDetails);

    expect(screen.getByText('Fuchs, Dachs und du')).toBeInTheDocument();
  });

  it('shows the skeleton for a chat neither the list nor the details know, as from a push', () => {
    const { container } = renderHeader();

    expect(screen.queryByRole('link', { name: /Chat-Details öffnen$/ })).toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('goes back in the history where the list is the previous entry', () => {
    renderHeader(
      undefined,
      <ListIsPreviousContext value>
        <ChatHeader />
      </ListIsPreviousContext>,
    );

    const notPrevented = fireEvent.click(backLink());

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('opens the list for a chat opened directly, as from a push', () => {
    renderHeader();

    const notPrevented = fireEvent.click(backLink());

    expect(mockBack).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
    expect(backLink()).toHaveAttribute('href', '/app/chat');
  });
});
