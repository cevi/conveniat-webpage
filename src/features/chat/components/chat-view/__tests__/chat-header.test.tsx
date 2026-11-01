/**
 * @jest-environment jsdom
 */

import type { ChatDetails } from '@/features/chat/api/types';
import { ChatHeader } from '@/features/chat/components/chat-view/chat-header';
import { ListIsPreviousContext } from '@/features/chat/context/list-is-previous-context';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { fireEvent, render, screen } from '@testing-library/react';

const CHAT_ID = 'chat-1';
const ME = 'user-me';

const cache: { list: ChatWithMessagePreview[] | undefined; details: ChatDetails | undefined } = {
  list: undefined,
  details: undefined,
};

jest.mock('@/trpc/client', () => ({
  trpc: {
    chat: {
      user: { useQuery: (): { data: string } => ({ data: ME }) },
      chatDetails: { useQuery: (): { data: ChatDetails | undefined } => ({ data: cache.details }) },
      chats: {
        useQuery: (
          _input: unknown,
          options: { select: (chats: ChatWithMessagePreview[]) => unknown },
        ): { data: unknown } => ({
          data: cache.list === undefined ? undefined : options.select(cache.list),
        }),
      },
    },
  },
}));
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

beforeEach(() => {
  cache.list = undefined;
  cache.details = undefined;
  mockBack.mockClear();
});

describe('ChatHeader', () => {
  it('names and pictures a private chat from the chat list before its details are loaded', () => {
    cache.list = [
      listEntry({
        name: 'Anna Muster v/o Fuchs',
        partner: { userId: 'user-anna', pictureUrl: '/pictures/anna.webp' },
      }),
    ];
    const { container } = render(<ChatHeader />);

    expect(detailsLink()).toHaveAccessibleName('Anna Muster v/o Fuchs, Chat-Details öffnen');
    expect(container.querySelector('img')).toHaveAttribute('src', '/pictures/anna.webp');
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('shows the same name and picture once the details are there', () => {
    cache.list = [
      listEntry({
        name: 'Anna Muster v/o Fuchs',
        partner: { userId: 'user-anna', pictureUrl: '/pictures/anna.webp' },
      }),
    ];
    const { container, rerender } = render(<ChatHeader />);
    const before = detailsLink().innerHTML;

    cache.details = {
      id: CHAT_ID,
      name: 'Anna Muster v/o Fuchs',
      type: 'ONE_TO_ONE',
      participants: [
        participant(ME, 'Max Muster v/o Igel'),
        participant('user-anna', 'Anna Muster v/o Fuchs', '/pictures/anna.webp'),
      ],
    } as ChatDetails;
    rerender(<ChatHeader />);

    expect(detailsLink().innerHTML).toBe(before);
    expect(container.querySelector('img')).toHaveAttribute('src', '/pictures/anna.webp');
  });

  it('names a group from the chat list and adds its members once the details are there', () => {
    cache.list = [listEntry({ name: 'Hofleitung Züri 11', chatType: 'GROUP' })];
    const { rerender } = render(<ChatHeader />);

    expect(detailsLink()).toHaveAccessibleName('Hofleitung Züri 11, Chat-Details öffnen');
    expect(screen.queryByText(/und du$/)).toBeNull();

    cache.details = {
      id: CHAT_ID,
      name: 'Hofleitung Züri 11',
      type: 'GROUP',
      participants: [
        participant(ME, 'Max Muster v/o Igel'),
        participant('user-anna', 'Anna Muster v/o Fuchs'),
        participant('user-ben', 'Ben Beispiel v/o Dachs'),
      ],
    } as ChatDetails;
    rerender(<ChatHeader />);

    expect(screen.getByText('Fuchs, Dachs und du')).toBeInTheDocument();
  });

  it('shows the skeleton for a chat neither the list nor the details know, as from a push', () => {
    const { container } = render(<ChatHeader />);

    expect(screen.queryByRole('link', { name: /Chat-Details öffnen$/ })).toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('goes back in the history where the list is the previous entry', () => {
    render(
      <ListIsPreviousContext value>
        <ChatHeader />
      </ListIsPreviousContext>,
    );

    const notPrevented = fireEvent.click(backLink());

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('opens the list for a chat opened directly, as from a push', () => {
    render(<ChatHeader />);

    const notPrevented = fireEvent.click(backLink());

    expect(mockBack).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
    expect(backLink()).toHaveAttribute('href', '/app/chat');
  });
});
