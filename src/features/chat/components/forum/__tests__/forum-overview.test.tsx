/**
 * @jest-environment jsdom
 */
import type { ForumConversationSummary } from '@/features/chat/api/forum/forum-conversations';
import type { ForumIntroTexts } from '@/features/chat/api/forum/forum-intro';
import type { ForumTopic } from '@/features/chat/api/forum/forum-queries';
import { DEFAULT_FORUM_FILTERS } from '@/features/chat/components/forum/forum-filter-sheet';
import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type React from 'react';

let topics: ForumTopic[] | undefined;
let settings: object;
let conversations: ForumConversationSummary[];
let pinnedPosts: ForumPostSummary[];
let feedPosts: ForumPostSummary[];
let intro: ForumIntroTexts;
let address = '';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
// the header's buttons render in place, as if the page had a header of its own
jest.mock('@/components/header/header-actions', () => ({
  SetHeaderActions: ({ children }: { children?: React.ReactNode }): React.ReactNode => children,
}));
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: (): null => null }));
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(address),
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const TOPIC_ID = 'topic';

const topic = (overrides: Partial<ForumTopic> = {}): ForumTopic => ({
  id: TOPIC_ID,
  name: 'Platz & Infrastruktur',
  description: null,
  subscribed: false,
  muted: false,
  isAdmin: false,
  openPostCount: 0,
  ...overrides,
});

const post = (overrides: Partial<ForumPostSummary>): ForumPostSummary => ({
  id: 'post',
  topicId: TOPIC_ID,
  topicName: 'Platz & Infrastruktur',
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

/**
 * Renders the forum as the phone has it: the topics (still loading while undefined), the
 * settings, the user's conversations, the pinned posts and the first page of the feed. With
 * `address` set to `topic=…` it is the feed of that topic, without it the start page.
 */
const renderForum = (): { calls: { path: string; input: unknown }[] } => {
  const feedPage = { items: feedPosts, nextCursor: null };
  const { trpc, queryClient, wrapper, calls } = createTestTrpc({
    // topics that are not loaded yet stay on their way
    'forum.getForumTopicList': () => topics ?? new Promise(() => {}),
    'forum.getForumSettings': () => settings,
    'forum.getForumIntro': () => intro,
    'forum.getForumConversationList': () => conversations,
    'forum.getForumPinnedPostList': () => pinnedPosts,
    'forum.getForumPostList': (input) =>
      // the kind chips narrow the feed on the server
      (input as { kind?: string }).kind === undefined
        ? feedPage
        : {
            items: feedPosts.filter(
              (candidate) => candidate.kind === (input as { kind: string }).kind,
            ),
            nextCursor: null,
          },
    'forum.getForumPostSuggestionList': () => [],
  });
  if (topics !== undefined) {
    queryClient.setQueryData(trpc.forum.getForumTopicList.queryKey({}), topics);
  }
  queryClient.setQueryData(trpc.forum.getForumSettings.queryKey({}), settings as never);
  queryClient.setQueryData(trpc.forum.getForumIntro.queryKey({}), intro);
  queryClient.setQueryData(trpc.forum.getForumConversationList.queryKey({}), conversations);
  const topicId = new URLSearchParams(address).get('topic');
  if (topicId === null) {
    queryClient.setQueryData(trpc.forum.getForumPinnedPostList.queryKey({}), pinnedPosts);
  } else {
    queryClient.setQueryData(trpc.forum.getForumPinnedPostList.queryKey({ topicId }), pinnedPosts);
    queryClient.setQueryData(
      trpc.forum.getForumPostList.infiniteQueryKey({ topicId, ...DEFAULT_FORUM_FILTERS }),
      { pages: [feedPage], pageParams: [null] },
    );
  }
  render(<ForumOverview />, { wrapper });
  return { calls };
};

const newPostLink = (): HTMLElement => screen.getByRole('link', { name: /Neuer Beitrag/ });

/** The list filters the filter sheet offers; the feed itself shows none. */
const filters = (): string[] => {
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  const sheet = screen.getByRole('dialog');
  return [
    'Alle',
    'Meine',
    'Abonniert',
    'Meine Aufträge',
    'Zur Freigabe',
    'Gemeldet oder ausgeblendet',
  ].filter((name) => within(sheet).queryByRole('button', { name }) !== null);
};

beforeEach(() => {
  localStorage.clear();
  intro = { title: '', text: '', points: [] };
  address = '';
  topics = [topic()];
  conversations = [];
  pinnedPosts = [];
  feedPosts = [];
  settings = { moderationRequired: false, canModerate: false, hasOpenAssignments: false };
});

describe('the start page of the forum', () => {
  it('lists the topics with their Kernteam and how much is open, each opening its feed', () => {
    topics = [
      topic({
        openPostCount: 4,
        kernteamLabels: ['Ressortleitung Infrastruktur', 'Platzchef'],
      }),
      topic({ id: 'essen', name: 'Essen', openPostCount: 0 }),
    ];
    renderForum();

    const infrastructure = screen.getByRole('link', { name: /Platz & Infrastruktur/ });
    expect(infrastructure.getAttribute('href')).toBe('/app/forum?topic=topic');
    expect(
      within(infrastructure).getByText('Ressortleitung Infrastruktur · Platzchef · 4 offen'),
    ).toBeTruthy();
    const food = screen.getByRole('link', { name: /Essen/ });
    expect(food.getAttribute('href')).toBe('/app/forum?topic=essen');
    // nothing open is no news, so no "0 offen"
    expect(within(food).queryByText('0 offen')).toBeNull();
  });

  it('puts the user’s own conversations on top, with their topic and what is unread', () => {
    conversations = [
      {
        postId: 'conversation-post',
        chatId: 'conversation-chat',
        title: 'Frage zur Anreise',
        topicName: 'Platz & Infrastruktur',
        status: 'IN_PROGRESS',
        closed: false,
        unreadCount: 2,
        lastActivity: new Date(),
      },
      {
        postId: 'closed-post',
        chatId: 'closed-chat',
        title: 'Allergie beim Znacht',
        topicName: 'Essen',
        status: 'DONE',
        closed: true,
        unreadCount: 0,
        lastActivity: new Date(),
      },
    ];
    renderForum();

    const section = screen.getByText('Deine Gespräche').closest('section') as HTMLElement;
    const open = within(section).getByRole('link', { name: /Frage zur Anreise/ });
    expect(open.getAttribute('href')).toBe('/app/forum/conversation-post');
    expect(within(open).getByText(/Platz & Infrastruktur · In Arbeit/)).toBeTruthy();
    expect(within(open).getByText('2')).toBeTruthy();
    const closed = within(section).getByRole('link', { name: /Allergie beim Znacht/ });
    expect(within(closed).getByText(/Essen · Geschlossen/)).toBeTruthy();
  });

  it('leaves out the conversations while the user has none', () => {
    renderForum();

    expect(screen.queryByText('Deine Gespräche')).toBeNull();
    expect(screen.getByText('Themen')).toBeTruthy();
  });

  it('shows the pinned posts of every topic', () => {
    pinnedPosts = [post({ id: 'pinned', pinned: true })];
    renderForum();

    expect(screen.getByRole('link', { name: /Zu heisses Wasser/ })).toBeTruthy();
  });

  it('offers a new post, also while the topics still load', () => {
    topics = undefined;
    renderForum();

    expect(newPostLink().getAttribute('href')).toBe('/app/forum/new');
  });

  it('tells someone in no topic that there is no forum for them, and offers nothing to write', () => {
    topics = [];
    renderForum();

    expect(screen.getByText('Noch kein Forum für dich')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Suchen/)).toBeNull();
    expect(screen.queryByRole('link', { name: /Neuer Beitrag/ })).toBeNull();
  });
});

describe('the feed of a topic', () => {
  beforeEach(() => {
    address = `topic=${TOPIC_ID}`;
  });

  it('shows the topic with its Kernteam above its posts', () => {
    topics = [
      topic({ description: 'Strom, Wasser, WC', kernteamLabels: ['Ressortleitung Infrastruktur'] }),
    ];
    renderForum();

    expect(screen.getByRole('heading', { name: 'Platz & Infrastruktur' })).toBeTruthy();
    expect(screen.getByText('Strom, Wasser, WC')).toBeTruthy();
    expect(screen.getByText('Ressortleitung Infrastruktur')).toBeTruthy();
  });

  it('offers to write the Kernteam privately where the topic allows it', () => {
    topics = [topic({ allowsPrivateConversations: true })];
    renderForum();

    expect(
      screen.getByRole('link', { name: 'Kernteam privat schreiben' }).getAttribute('href'),
    ).toBe('/app/forum/new?conversation=1&topic=topic');
  });

  it('offers no private conversation in a topic that does not take them', () => {
    topics = [topic({ allowsPrivateConversations: false })];
    renderForum();

    expect(screen.queryByRole('link', { name: 'Kernteam privat schreiben' })).toBeNull();
  });

  it('writes a new post into the topic', () => {
    renderForum();

    expect(newPostLink().getAttribute('href')).toBe('/app/forum/new?topic=topic');
  });

  it('narrows the feed to one kind and back to all', async () => {
    feedPosts = [
      post({ id: 'question', title: 'Wo gibt es Strom?', kind: 'QUESTION' }),
      post({ id: 'problem', title: 'WC beim Quartier 3 verstopft', kind: 'PROBLEM' }),
    ];
    const { calls } = renderForum();

    expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Problem' }));

    expect(await screen.findByRole('link', { name: /WC beim Quartier 3/ })).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Wo gibt es Strom/ })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Problem' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      calls.filter((call) => call.path === 'forum.getForumPostList').map((call) => call.input),
    ).toContainEqual(expect.objectContaining({ topicId: TOPIC_ID, kind: 'PROBLEM' }));

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(await screen.findByRole('link', { name: /Wo gibt es Strom/ })).toBeTruthy();
  });

  it('keeps the filters in their sheet, and offers a participant only those that apply', () => {
    renderForum();

    expect(screen.queryByRole('button', { name: 'Meine' })).toBeNull();
    expect(filters()).toEqual(['Alle', 'Meine', 'Abonniert']);
  });

  it('adds the assignments of a helper, and the queue and the flagged posts of a moderator', () => {
    settings = { moderationRequired: true, canModerate: true, hasOpenAssignments: true };
    renderForum();

    expect(filters()).toEqual([
      'Alle',
      'Meine',
      'Abonniert',
      'Meine Aufträge',
      'Zur Freigabe',
      'Gemeldet oder ausgeblendet',
    ]);
  });

  it('offers its Kernteam the flagged posts and the settings of the topic instead of the bell', () => {
    topics = [topic({ isAdmin: true })];
    renderForum();

    expect(screen.getByRole('button', { name: 'Einstellungen des Themas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /abonnieren/ })).toBeNull();
    expect(filters()).toContain('Gemeldet oder ausgeblendet');
  });

  it('gives a participant the bell of the topic', () => {
    renderForum();

    expect(
      screen.getByRole('button', { name: 'Neue Beiträge in diesem Thema abonnieren' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Einstellungen des Themas' })).toBeNull();
  });

  it('marks a pinned post by its pin, not by a section title', () => {
    const pinnedPost = post({ id: 'pinned', pinned: true });
    pinnedPosts = [pinnedPost];
    feedPosts = [pinnedPost, post({ id: 'other', title: 'WC beim Quartier 3 verstopft' })];
    renderForum();

    expect(screen.getByRole('link', { name: /Angeheftet.*Zu heisses Wasser/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Angeheftet.*WC beim Quartier 3/ })).toBeNull();
    expect(screen.getAllByRole('link', { name: /Zu heisses Wasser/ })).toHaveLength(1);
    expect(screen.queryByText('Neueste')).toBeNull();
  });

  it('says there is nothing besides the pinned posts instead of showing an empty list', () => {
    const pinnedPost = post({ id: 'pinned', pinned: true });
    pinnedPosts = [pinnedPost];
    feedPosts = [pinnedPost];
    renderForum();

    expect(screen.getByText('Noch keine weiteren Beiträge')).toBeTruthy();
    // one quiet line, not the empty state of an empty forum
    expect(screen.queryByRole('heading', { name: 'Noch keine weiteren Beiträge' })).toBeNull();
    expect(screen.queryByText(/Hier erscheinen Fragen/)).toBeNull();
  });

  it('shows an empty topic its full empty state', () => {
    renderForum();

    expect(screen.getByRole('heading', { name: 'Noch keine Beiträge' })).toBeTruthy();
    expect(screen.getByText(/Hier erscheinen Fragen/)).toBeTruthy();
  });

  it('leaves the pinned posts out of a filter that matches nothing, and leads back', async () => {
    pinnedPosts = [post({ id: 'pinned', pinned: true })];
    renderForum();
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Meine' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schliessen' }));

    expect(await screen.findByText('Kein Beitrag passt zu diesen Filtern.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Zu heisses Wasser/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(screen.getByRole('link', { name: /Zu heisses Wasser/ })).toBeTruthy();
  });

  it('offers to write what the search found nothing for, in this topic', async () => {
    renderForum();
    fireEvent.change(screen.getByPlaceholderText(/Suchen/), { target: { value: 'Zeltheringe' } });

    expect(await screen.findByText('Noch kein Beitrag zu «Zeltheringe».')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Als neuen Beitrag schreiben' }).getAttribute('href'),
    ).toBe('/app/forum/new?title=Zeltheringe&topic=topic');
  });

  it('names the status of a post in the feed only where it is no longer open', () => {
    feedPosts = [
      post({ id: 'open', title: 'WC beim Quartier 3 verstopft', excerpt: 'Es riecht.' }),
      post({ id: 'working', title: 'Strom fällt aus', status: 'IN_PROGRESS' }),
    ];
    renderForum();

    const open = screen.getByRole('link', { name: /WC beim Quartier 3/ });
    expect(within(open).queryByText('Offen')).toBeNull();
    // the feed lists titles; the text is one tap away
    expect(within(open).queryByText('Es riecht.')).toBeNull();
    const working = screen.getByRole('link', { name: /Strom fällt aus/ });
    expect(within(working).getByText('In Arbeit')).toBeTruthy();
  });
});

describe('the intro of the forum', () => {
  const written: ForumIntroTexts = {
    title: 'Frag das Lager',
    text: 'Die Ressorts antworten.',
    points: [
      { icon: 'search', title: 'Erst suchen, dann schreiben', text: '' },
      { icon: 'siren', title: 'Notfall?', text: 'Nicht ins Forum, sondern in den Notfall-Tab.' },
    ],
  };

  it("greets a first visit on this device with the editors' intro instead of the forum", () => {
    intro = written;
    renderForum();
    expect(screen.getByRole('heading', { name: 'Frag das Lager' })).toBeTruthy();
    expect(screen.getByText('Erst suchen, dann schreiben')).toBeTruthy();
    expect(screen.queryByText('Platz & Infrastruktur')).toBeNull();
  });

  it('opens the forum after "Los geht\u2019s" and does not greet again on this device', () => {
    intro = written;
    renderForum();
    fireEvent.click(screen.getByRole('button', { name: 'Los geht\u2019s' }));
    expect(screen.getByText('Platz & Infrastruktur')).toBeTruthy();
    expect(localStorage.getItem('forum-intro-seen')).toBe('1');
  });

  it('lets the ✕ skip it like "Los geht\u2019s" does', () => {
    intro = written;
    renderForum();
    expect(screen.getByRole('dialog', { name: 'Frag das Lager' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schliessen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('forum-intro-seen')).toBe('1');
  });

  it('shows it again from "So funktioniert\u2019s"', () => {
    intro = written;
    localStorage.setItem('forum-intro-seen', '1');
    renderForum();
    expect(screen.queryByRole('heading', { name: 'Frag das Lager' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'So funktioniert\u2019s' }));
    expect(screen.getByRole('heading', { name: 'Frag das Lager' })).toBeTruthy();
  });

  it('opens the forum straight away while editors wrote none, without a way to it', () => {
    renderForum();
    expect(screen.getByText('Platz & Infrastruktur')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'So funktioniert\u2019s' })).toBeNull();
  });
});
