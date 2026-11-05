/**
 * @jest-environment jsdom
 */
import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import { render, screen } from '@testing-library/react';

let topics: unknown[] | undefined;
const query = (data: unknown): object => ({ data, isLoading: false, isError: false });

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/header/header-actions', () => ({ SetHeaderActions: (): null => null }));
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
      getForumSettings: { useQuery: (): object => query({ moderationRequired: false }) },
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

describe('the forum feed', () => {
  it('offers a new post in a topic the user belongs to', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', subscribed: false }];
    render(<ForumOverview />);

    expect(newPostLink().getAttribute('href')).toBe('/app/forum/new');
  });

  it('offers a new post while the topics still load', () => {
    topics = undefined;
    render(<ForumOverview />);

    expect(newPostLink()).toBeTruthy();
  });

  it('offers a new post without any topic, for a private report', () => {
    topics = [];
    render(<ForumOverview />);

    expect(newPostLink()).toBeTruthy();
    expect(screen.getByText(/privat an die Zentrale melden/)).toBeTruthy();
  });
});
