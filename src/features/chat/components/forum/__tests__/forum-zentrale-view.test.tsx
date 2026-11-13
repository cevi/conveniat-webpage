/**
 * @jest-environment jsdom
 */
import type { ForumTodoList, ForumTodoPost } from '@/features/chat/api/forum/forum-zentrale';
import { ForumZentraleView } from '@/features/chat/components/forum/forum-zentrale-view';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, within } from '@testing-library/react';

let searchParameters = new URLSearchParams();

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: (): null => null }));
// a phone: the post opens on its own page, not in a pane next to the list
jest.mock('@/features/chat/components/forum/forum-post-view', () => ({
  ForumPostView: (): null => null,
}));
// the forum's own back bar stands in for the app header, which these tests do not render
jest.mock('@/components/header/hide-header-context', () => ({ SetHideHeader: (): null => null }));
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => searchParameters,
  usePathname: (): string => '/app/forum/zentrale',
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const post = (overrides: Partial<ForumTodoPost>): ForumTodoPost => ({
  id: 'post',
  topicId: 'topic',
  topicName: 'Platz & Infrastruktur',
  title: 'Zu heisses Wasser',
  excerpt: '',
  status: 'OPEN',
  createdAt: new Date(),
  author: { id: 'author', name: 'Lea' },
  byTopicAdmin: false,
  location: null,
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  pinned: false,
  imageCount: 0,
  claimedBy: null,
  forwardedTo: [],
  waiting: false,
  ...overrides,
});

const emptyList: ForumTodoList = {
  flagged: [],
  conversations: [],
  waiting: [],
  mine: [],
  totals: { flagged: 0, conversations: 0, waiting: 0, mine: 0 },
  canSeeAll: false,
};

const renderTodo = (list: ForumTodoList): { calls: { path: string; input: unknown }[] } => {
  const { wrapper, calls } = createTestTrpc({ 'forum.getForumTodoList': () => list });
  render(<ForumZentraleView />, { wrapper });
  return { calls };
};

/** The rows under a section's label. */
const section = (name: string): HTMLElement => {
  const label = screen.getByRole('heading', { name: new RegExp(`^${name}`) });
  const element = label.closest('section');
  if (element === null) throw new Error(`no section ${name}`);
  return element;
};

beforeEach(() => {
  searchParameters = new URLSearchParams();
});

describe('Zu tun', () => {
  it('lists flagged posts, conversations, waiting posts and forwards, each in its own section', async () => {
    renderTodo({
      ...emptyList,
      flagged: [
        post({
          id: 'flagged',
          title: 'Laute Musik',
          openFlags: 3,
          reviewRequested: true,
          hidden: true,
        }),
      ],
      conversations: [
        post({
          id: 'conversation',
          title: 'Frage zur Anreise',
          conversation: { topicName: 'Anreise' },
        }),
      ],
      waiting: [
        post({
          id: 'waiting',
          title: 'Wo ist das Holz?',
          kind: 'QUESTION',
          waiting: true,
          claimedBy: { id: 'nina', name: 'Nina' },
        }),
      ],
    });

    await screen.findByText('Laute Musik');
    const flagged = section('Gemeldet');
    expect(within(flagged).getByText('3 Meldungen')).toBeTruthy();
    expect(within(flagged).getByText('Überarbeitet, bitte prüfen')).toBeTruthy();
    expect(within(flagged).getByText('ausgeblendet')).toBeTruthy();
    expect(within(flagged).getByRole('link').getAttribute('href')).toBe(
      '/app/forum/flagged?from=zentrale',
    );

    const conversations = section('Private Gespräche');
    expect(within(conversations).getByText('Frage zur Anreise')).toBeTruthy();
    expect(within(conversations).getByText('Anreise')).toBeTruthy();

    const waiting = section('Wartet auf Antwort');
    expect(within(waiting).getByText('Wo ist das Holz?')).toBeTruthy();
    expect(within(waiting).getByText('Frage')).toBeTruthy();
    expect(within(waiting).getByText('Nina bearbeitet')).toBeTruthy();
    expect(within(waiting).getByText(/^wartet /)).toBeTruthy();

    expect(within(section('An dich weitergeleitet')).getByText('Nichts')).toBeTruthy();
  });

  it('says there is nothing to do when every section is empty', async () => {
    renderTodo(emptyList);

    expect(await screen.findByText('Nichts zu tun')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /^Gemeldet/ })).toBeNull();
  });

  it('offers all topics only to whoever moderates every topic', async () => {
    renderTodo(emptyList);
    await screen.findByText('Nichts zu tun');
    expect(screen.queryByRole('button', { name: 'Alle' })).toBeNull();
  });

  it('says how many more a section holds and loads the next ones on request', async () => {
    const { wrapper, calls } = createTestTrpc({
      'forum.getForumTodoList': (input) => {
        const limit = (input as { limits: { waiting?: number } }).limits.waiting ?? 1;
        return {
          ...emptyList,
          waiting: Array.from({ length: Math.min(limit, 3) }, (_, index) =>
            post({ id: `waiting-${String(index)}`, title: `Frage ${String(index)}` }),
          ),
          totals: { ...emptyList.totals, waiting: 3 },
        };
      },
    });
    render(<ForumZentraleView />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Mehr laden (2 weitere)' }));

    expect(await screen.findByText('Frage 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Mehr laden/ })).toBeNull();
    expect(calls.at(-1)).toEqual({
      path: 'forum.getForumTodoList',
      input: { scope: 'mine', limits: { waiting: 100 } },
    });
  });

  it('shows the topics of the caller first and all of them on request', async () => {
    const { calls } = renderTodo({ ...emptyList, canSeeAll: true });

    const mine = await screen.findByRole('button', { name: 'Meine Themen' });
    expect(mine.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('false');
    expect(calls).toEqual([
      { path: 'forum.getForumTodoList', input: { scope: 'mine', limits: {} } },
    ]);
  });
});
