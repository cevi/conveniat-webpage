/**
 * @jest-environment jsdom
 */
import { DEFAULT_FORUM_FILTERS } from '@/features/chat/components/forum/forum-filter-sheet';
import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let topics: unknown[] | undefined;
let settings: object;
let pinnedPosts: ForumPostSummary[];
let feedPosts: ForumPostSummary[];

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
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

/**
 * Renders the feed with the forum as the phone has it: the topics (still loading while
 * undefined), the settings, the pinned posts and the first page of the feed.
 */
const renderOverview = (): void => {
  const feedPage = { items: feedPosts, nextCursor: null };
  const { trpc, queryClient, wrapper } = createTestTrpc({
    // topics that are not loaded yet stay on their way
    'forum.getForumTopicList': () => topics ?? new Promise(() => {}),
    'forum.getForumSettings': () => settings,
    'forum.getForumPinnedPostList': () => pinnedPosts,
    'forum.getForumPostList': () => feedPage,
    'forum.getForumPostSuggestionList': () => [],
  });
  if (topics !== undefined) {
    queryClient.setQueryData(trpc.forum.getForumTopicList.queryKey({}), topics as never);
  }
  queryClient.setQueryData(trpc.forum.getForumSettings.queryKey({}), settings as never);
  queryClient.setQueryData(trpc.forum.getForumPinnedPostList.queryKey({}), pinnedPosts);
  queryClient.setQueryData(trpc.forum.getForumPostList.infiniteQueryKey(DEFAULT_FORUM_FILTERS), {
    pages: [feedPage],
    pageParams: [null],
  });
  render(<ForumOverview />, { wrapper });
};

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
    renderOverview();

    expect(newPostLink().getAttribute('href')).toBe('/app/forum/new');
  });

  it('offers a new post while the topics still load', () => {
    topics = undefined;
    renderOverview();

    expect(newPostLink()).toBeTruthy();
  });

  it('shows someone in no topic only the way to the Zentrale', () => {
    topics = [];
    renderOverview();

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
    renderOverview();

    expect(screen.queryByRole('button', { name: 'Meine' })).toBeNull();

    expect(filters()).toEqual(['Alle', 'Meine', 'Abonniert']);
  });

  it('adds the assignments of a helper and the queue of a moderator', () => {
    topics = [topic];
    settings = { moderationRequired: true, canModerate: true, hasOpenAssignments: true };
    renderOverview();

    expect(filters()).toEqual(['Alle', 'Meine', 'Abonniert', 'Meine Aufträge', 'Zur Freigabe']);
  });

  it('marks a pinned post by its pin, not by a section title', () => {
    topics = [topic];
    const pinnedPost = post({ id: 'pinned', pinned: true });
    pinnedPosts = [pinnedPost];
    feedPosts = [pinnedPost, post({ id: 'other', title: 'WC beim Quartier 3 verstopft' })];
    renderOverview();

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
    renderOverview();

    expect(screen.getByText('Noch keine weiteren Beiträge')).toBeTruthy();
  });
});
