/**
 * @jest-environment jsdom
 */
import { ForumComposer } from '@/features/chat/components/forum/forum-composer';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

let topics: unknown[];
let privateReportsAvailable = true;
const createPost = jest.fn<Promise<{ id: string; pending: boolean }>, [unknown]>(() =>
  Promise.resolve({ id: 'post', pending: false }),
);
const joinReportTopic = jest.fn(() => Promise.resolve({ topicId: 'zentrale' }));

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
let address = '';
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(address),
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

/** renders the composer for someone in `topics`, with the forum already loaded */
const renderComposer = (): void => {
  const settings = { moderationRequired: false, privateReportsAvailable };
  const { trpc, queryClient, wrapper } = createTestTrpc({
    'forum.getForumTopicList': () => topics,
    'forum.getForumSettings': () => settings,
    'forum.getForumPostSuggestionList': () => [],
    'forum.createForumPost': createPost,
    'forum.getForumPrivateReportTopic': joinReportTopic,
  });
  queryClient.setQueryData(trpc.forum.getForumTopicList.queryKey({}), topics as never);
  queryClient.setQueryData(trpc.forum.getForumSettings.queryKey({}), settings as never);
  render(<ForumComposer />, { wrapper });
};

const segment = (name: string): HTMLElement => screen.getByRole('button', { name });
const writeTitle = (): void => {
  fireEvent.change(screen.getByPlaceholderText(/Toitoi in der Mitte/), {
    target: { value: 'Toitoi in der Mitte ist voll' },
  });
};

beforeEach(() => {
  address = '';
  privateReportsAvailable = true;
  createPost.mockClear();
  joinReportTopic.mockClear();
});

describe('the composer', () => {
  it('is the private report, without a toggle, for someone in no topic', () => {
    topics = [];
    renderComposer();
    writeTitle();

    expect(screen.queryByRole('button', { name: 'Öffentlich' })).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'An die Zentrale senden' }).disabled,
    ).toBe(false);
    expect(screen.getByText(/Nur du und das OK sehen deine Nachricht/)).toBeTruthy();
  });

  it('switches between Öffentlich and Privat for someone in a topic', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();
    fireEvent.click(segment('Privat'));

    expect(segment('Privat').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'An die Zentrale senden' })).toBeTruthy();
  });

  it('sends a private report as a private post to the topic for private reports', async () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();
    fireEvent.click(segment('Privat'));
    fireEvent.click(screen.getByRole('button', { name: 'An die Zentrale senden' }));

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({
      topicId: 'zentrale',
      private: true,
      title: 'Toitoi in der Mitte ist voll',
    });
  });

  it('offers no Privat while editors chose no topic for private reports', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    privateReportsAvailable = false;
    address = 'private=1';
    renderComposer();
    writeTitle();

    expect(screen.queryByRole('button', { name: 'Privat' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeTruthy();
  });

  it('starts on Öffentlich for someone in a topic', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();

    expect(segment('Öffentlich').getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(false);
  });

  it('brings a removed spot back with Rückgängig', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    address = 'lng=8.301851&lat=46.504806&annotation=q1&label=Quartier+1';
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Standort entfernen' }));
    expect(screen.queryByText('Quartier 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));

    expect(screen.getByText('Quartier 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Rückgängig' })).toBeNull();
  });
});
