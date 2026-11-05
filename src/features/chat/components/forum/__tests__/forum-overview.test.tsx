/**
 * @jest-environment jsdom
 */
import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let topics: unknown[] | undefined;
let settings: object;
const query = (data: unknown): object => ({ data, isLoading: false, isError: false });

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
// the header's buttons render in place, as if the page had a header of its own
jest.mock('@/components/header/header-actions', () => ({
  SetHeaderActions: ({ children }: { children?: React.ReactNode }): React.ReactNode => children,
}));
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: (): null => null }));
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
}));
jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): object => ({}),
    forum: {
      getForumTopicList: { useQuery: (): object => query(topics) },
      getForumPinnedPostList: { useQuery: (): object => query([]) },
      getForumSettings: { useQuery: (): object => query(settings) },
      getForumPostSuggestionList: { useQuery: (): object => query([]) },
      getForumPostList: {
        useInfiniteQuery: (): object => ({
          data: { pages: [{ items: [], nextCursor: null }] },
          isLoading: false,
          isError: false,
          hasNextPage: false,
        }),
      },
      updateForumTopicSubscription: { useMutation: (): object => ({ mutate: jest.fn() }) },
    },
  },
}));

const newPostLink = (): HTMLElement => screen.getByRole('link', { name: /Neuer Beitrag/ });
/** The list filters the filter sheet offers; the feed itself shows none. */
const filters = (): string[] => {
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  return ['Alle', 'Meine', 'Abonniert', 'Meine Aufträge', 'Zur Freigabe'].filter(
    (name) => screen.queryByRole('button', { name }) !== null,
  );
};
const topic = { id: 'topic', name: 'Platz & Infrastruktur', subscribed: false };

beforeEach(() => {
  settings = { moderationRequired: false, canModerate: false, hasOpenAssignments: false };
});

describe('the forum feed', () => {
  it('offers a new post in a topic the user belongs to', () => {
    topics = [topic];
    render(<ForumOverview />);

    expect(newPostLink().getAttribute('href')).toBe('/app/forum/new');
  });

  it('offers a new post while the topics still load', () => {
    topics = undefined;
    render(<ForumOverview />);

    expect(newPostLink()).toBeTruthy();
  });

  it('shows someone in no topic only the way to the Zentrale', () => {
    topics = [];
    render(<ForumOverview />);

    expect(screen.getByRole('link', { name: 'An die Zentrale melden' }).getAttribute('href')).toBe(
      '/app/forum/new',
    );
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByPlaceholderText(/Suchen/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Neuer Beitrag/ })).toBeNull();
  });

  it('keeps the filters in their sheet, and offers a participant only those that apply', () => {
    topics = [topic];
    render(<ForumOverview />);

    expect(screen.queryByRole('button', { name: 'Meine' })).toBeNull();

    expect(filters()).toEqual(['Alle', 'Meine', 'Abonniert']);
  });

  it('adds the assignments of a helper and the queue of a moderator', () => {
    topics = [topic];
    settings = { moderationRequired: true, canModerate: true, hasOpenAssignments: true };
    render(<ForumOverview />);

    expect(filters()).toEqual(['Alle', 'Meine', 'Abonniert', 'Meine Aufträge', 'Zur Freigabe']);
  });
});
