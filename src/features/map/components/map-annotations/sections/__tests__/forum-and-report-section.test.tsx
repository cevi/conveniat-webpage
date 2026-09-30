/**
 * @jest-environment jsdom
 */
import { AnnotationForumAndReportSection } from '@/features/map/components/map-annotations/sections/forum-and-report-section';
import { handleLogin } from '@/utils/login-handler';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';

const reportProblem = jest.fn();

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/utils/login-handler', () => ({ handleLogin: jest.fn() }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
jest.mock('next-i18n-router/client', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('next/navigation', () => ({ useRouter: (): object => ({ push: jest.fn() }) }));
jest.mock('@/trpc/client', () => ({
  trpc: {
    chat: {
      reportProblem: {
        useMutation: (): object => ({ mutate: reportProblem, isPending: false, error: undefined }),
      },
    },
  },
}));

const openAs = (status: 'authenticated' | 'unauthenticated'): void => {
  jest.mocked(useSession).mockReturnValue({ status } as ReturnType<typeof useSession>);
  render(<AnnotationForumAndReportSection coordinates={[8.301, 46.502]} />);
};

describe('reporting a problem from the map', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends a guest to the login instead of sending a report', () => {
    openAs('unauthenticated');

    fireEvent.click(screen.getByRole('button', { name: /Anmelden, um ein Problem zu melden/ }));

    expect(handleLogin).toHaveBeenCalled();
    expect(reportProblem).not.toHaveBeenCalled();
  });

  it('sends the report for a logged-in user', () => {
    openAs('authenticated');

    fireEvent.click(screen.getByRole('button', { name: /Problem melden/ }));

    expect(reportProblem).toHaveBeenCalledWith({ location: [8.301, 46.502] });
    expect(handleLogin).not.toHaveBeenCalled();
  });
});
