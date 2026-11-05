/**
 * @jest-environment jsdom
 */
import { AnnotationForumAndReportSection } from '@/features/map/components/map-annotations/sections/forum-and-report-section';
import { handleLogin } from '@/utils/login-handler';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';

let forumEnabled = true;
let privateReportsAvailable = true;
let openPosts: unknown[] = [];

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/utils/login-handler', () => ({ handleLogin: jest.fn() }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
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
      getForumSettings: {
        useQuery: (): object => ({ data: { privateReportsAvailable } }),
      },
    },
    chat: {
      toggleReaction: { useMutation: (): object => ({ mutate: jest.fn(), isPending: false }) },
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
    privateReportsAvailable = true;
    openPosts = [];
  });

  it('sends a guest to the login instead of sending a report', () => {
    openAs('unauthenticated');

    fireEvent.click(screen.getByRole('button', { name: /Anmelden, um ein Problem zu melden/ }));

    expect(handleLogin).toHaveBeenCalled();
  });

  it('opens a new forum post with the place filled in', () => {
    openAs('authenticated');

    const link = screen.getByRole('link', { name: /Problem melden/ });
    const href = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(href.pathname).toBe('/app/forum/new');
    expect(href.searchParams.get('annotation')).toBe('wc-nord');
    expect(href.searchParams.get('label')).toBe('WC-Anlage Nord');
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

  it('opens the same composer, switched to private, for a report to the Zentrale', () => {
    openAs('authenticated');

    const link = screen.getByRole('link', { name: /Privat an die Zentrale melden/ });
    const href = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(href.pathname).toBe('/app/forum/new');
    expect(href.searchParams.get('private')).toBe('1');
    expect(href.searchParams.get('annotation')).toBe('wc-nord');
  });

  it('offers no private report while editors chose no topic for it', () => {
    privateReportsAvailable = false;
    openAs('authenticated');

    expect(screen.getByRole('link', { name: /Problem melden/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Privat an die Zentrale melden/ })).toBeNull();
  });

  it('offers no report while the forum is off, since every report goes there', () => {
    forumEnabled = false;
    openAs('authenticated');

    expect(screen.queryByText(/Problem melden/)).toBeNull();
  });
});
