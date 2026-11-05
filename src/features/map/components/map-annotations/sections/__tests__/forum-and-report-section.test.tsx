/**
 * @jest-environment jsdom
 */
import { AnnotationForumAndReportSection } from '@/features/map/components/map-annotations/sections/forum-and-report-section';
import { handleLogin } from '@/utils/login-handler';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';

const reportProblem = jest.fn();
let forumEnabled = true;
let openPosts: unknown[] = [];

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/utils/login-handler', () => ({ handleLogin: jest.fn() }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('next/navigation', () => ({ useRouter: (): object => ({ push: jest.fn() }) }));
jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): object => ({ forum: { getForumPostList: { invalidate: jest.fn() } } }),
    appContent: {
      getDashboardConfig: {
        useQuery: (): object => ({ data: { featureFlags: { forumEnabled } } }),
      },
    },
    forum: {
      getForumPostList: { useQuery: (): object => ({ data: { items: openPosts } }) },
    },
    chat: {
      toggleReaction: { useMutation: (): object => ({ mutate: jest.fn(), isPending: false }) },
      reportProblem: {
        useMutation: (): object => ({ mutate: reportProblem, isPending: false, error: undefined }),
      },
    },
  },
}));

const openAs = (status: 'authenticated' | 'unauthenticated'): void => {
  jest.mocked(useSession).mockReturnValue({ status } as ReturnType<typeof useSession>);
  render(
    <AnnotationForumAndReportSection
      coordinates={[8.301, 46.502]}
      annotation={{ id: 'wc-nord', title: 'WC-Anlage Nord' }}
    />,
  );
};

describe('reporting a problem from the map', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    forumEnabled = true;
    openPosts = [];
  });

  it('sends a guest to the login instead of sending a report', () => {
    openAs('unauthenticated');

    fireEvent.click(screen.getByRole('button', { name: /Anmelden, um ein Problem zu melden/ }));

    expect(handleLogin).toHaveBeenCalled();
    expect(reportProblem).not.toHaveBeenCalled();
  });

  it('opens a new forum post with the place filled in', () => {
    openAs('authenticated');

    const link = screen.getByRole('link', { name: /Problem melden/ });
    const href = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(href.pathname).toBe('/app/forum/new');
    expect(href.searchParams.get('annotation')).toBe('wc-nord');
    expect(href.searchParams.get('label')).toBe('WC-Anlage Nord');
    expect(reportProblem).not.toHaveBeenCalled();
  });

  it('lists what is already reported here first', () => {
    openPosts = [
      {
        id: 'post-1',
        title: 'Kein Wasser bei der WC-Anlage Nord',
        status: 'IN_PROGRESS',
        likeCount: 37,
        likedByMe: false,
      },
    ];
    openAs('authenticated');

    expect(screen.getByText('Kein Wasser bei der WC-Anlage Nord')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ich auch/ })).toBeTruthy();
  });

  it('keeps the private report to the Zentrale', () => {
    openAs('authenticated');

    fireEvent.click(screen.getByRole('button', { name: /Privat an die Zentrale melden/ }));

    expect(reportProblem).toHaveBeenCalledWith({ location: [8.301, 46.502] });
  });

  it('sends the private report directly where the forum is off', () => {
    forumEnabled = false;
    openAs('authenticated');

    fireEvent.click(screen.getByRole('button', { name: /Problem melden/ }));

    expect(reportProblem).toHaveBeenCalledWith({ location: [8.301, 46.502] });
  });
});
