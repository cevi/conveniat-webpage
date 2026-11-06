/**
 * @jest-environment jsdom
 */
import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let topics: unknown[] | undefined;
let settings: object;
let pinnedPosts: ForumPostSummary[];
let feedPosts: ForumPostSummary[];
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
      getForumPinnedPostList: { useQuery: (): object => query(pinnedPosts) },
      getForumSettings: { useQuery: (): object => query(settings) },
      getForumPostSuggestionList: { useQuery: (): object => query([]) },
      getForumPostList: {
        useInfiniteQuery: (): object => ({
          data: { pages: [{ items: feedPosts, nextCursor: null }] },
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
const post = (overrides: Partial<ForumPostSummary>): ForumPostSummary => ({
  id: 'post',
  topicId: topic.id,
  topicName: topic.name,
  title: 'Zu heisses Wasser',
  excerpt: '',
  status: 'OPEN',
  createdAt: new Date(0),
  author: null,
  byTopicAdmin: false,
  location: null,
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  pinned: false,
  imageCount: 0,
  ...overrides,
});

beforeEach(() => {
  pinnedPosts = [];
  feedPosts = [];
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

  it('marks a pinned post by its pin, not by a section title', () => {
    topics = [topic];
    const pinnedPost = post({ id: 'pinned', pinned: true });
    pinnedPosts = [pinnedPost];
    feedPosts = [pinnedPost, post({ id: 'other', title: 'WC beim Quartier 3 verstopft' })];
    render(<ForumOverview />);

    expect(screen.getByRole('link', { name: /Angeheftet.*Zu heisses Wasser/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Angeheftet.*WC beim Quartier 3/ })).toBeNull();
    expect(screen.getAllByRole('link', { name: /Zu heisses Wasser/ })).toHaveLength(1);
    expect(screen.queryByText('Neueste')).toBeNull();
  });

  it('says there is nothing besides the pinned posts instead of showing an empty list', () => {
    topics = [topic];
    const pinnedPost = post({ id: 'pinned', pinned: true });
    pinnedPosts = [pinnedPost];
    feedPosts = [pinnedPost];
    render(<ForumOverview />);

    expect(screen.getByText('Noch keine weiteren Beiträge')).toBeTruthy();
  });
});
