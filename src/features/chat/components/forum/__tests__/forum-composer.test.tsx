/**
 * @jest-environment jsdom
 */
import { ForumComposer } from '@/features/chat/components/forum/forum-composer';
import { fireEvent, render, screen } from '@testing-library/react';

let topics: unknown[] | undefined;
const query = (data: unknown): object => ({ data, isLoading: false });
const mutation = (): object => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
}));
jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): object => ({}),
    forum: {
      getForumTopicList: { useQuery: (): object => query(topics) },
      getForumSettings: { useQuery: (): object => query({ moderationRequired: false }) },
      getForumPostSuggestionList: { useQuery: (): object => query([]) },
      createForumPost: { useMutation: (): object => mutation() },
    },
    chat: {
      toggleReaction: { useMutation: (): object => mutation() },
      getUploadUrl: { useMutation: (): object => mutation() },
      reportProblem: { useMutation: (): object => mutation() },
      sendMessage: { useMutation: (): object => mutation() },
    },
  },
}));

const segment = (name: string): HTMLElement => screen.getByRole('button', { name });
const writeTitle = (): void => {
  fireEvent.change(screen.getByPlaceholderText(/Toitoi in der Mitte/), {
    target: { value: 'Toitoi in der Mitte ist voll' },
  });
};

describe('the composer', () => {
  it('shows the toggle without a topic, starts on Privat and sends to the Zentrale', () => {
    topics = [];
    render(<ForumComposer />);
    writeTitle();

    expect(segment('Privat').getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'An die Zentrale senden' }).disabled,
    ).toBe(false);
  });

  it('turns the button into Veröffentlichen, which needs a topic, when switched to Öffentlich', () => {
    topics = [];
    render(<ForumComposer />);
    writeTitle();
    fireEvent.click(segment('Öffentlich'));

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(true);
    expect(screen.getByText(/sobald du zu einem Forum-Thema gehörst/)).toBeTruthy();
  });

  it('starts on Öffentlich for someone in a topic', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    render(<ForumComposer />);
    writeTitle();

    expect(segment('Öffentlich').getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(false);
  });
});
