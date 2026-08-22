/**
 * @jest-environment jsdom
 */

import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import { fireEvent, render, screen } from '@testing-library/react';

let mockIsOffline = false;
const mockRefetch = jest.fn();
let mockQueryResult: {
  data: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  refetch: mockRefetch,
};
const mockUseQuery = jest.fn<typeof mockQueryResult, [unknown, unknown]>(() => mockQueryResult);

jest.mock('next/offline', () => ({
  useOffline: (): boolean => mockIsOffline,
}));

jest.mock('next-auth/react', () => ({
  useSession: (): { status: string } => ({ status: 'authenticated' }),
}));

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

const mutationResult = { mutate: jest.fn(), isPending: false };

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({
      shifts: {
        getShiftStatus: { invalidate: jest.fn() },
        getMyShiftEnrollments: { invalidate: jest.fn() },
        getShifts: { invalidate: jest.fn() },
      },
      schedule: { getHelperShifts: { invalidate: jest.fn() } },
    }),
    shifts: {
      getShiftStatus: {
        useQuery: (input: unknown, options: unknown): unknown => mockUseQuery(input, options),
      },
      enrollInShift: { useMutation: (): unknown => mutationResult },
      switchIntoShift: { useMutation: (): unknown => mutationResult },
      unenrollFromShift: { useMutation: (): unknown => mutationResult },
    },
  },
}));

const OFFLINE_TEXT = 'Offline – Anmeldung nicht möglich.';
const UNAVAILABLE_TEXT = 'Anmeldestatus konnte nicht geladen werden.';

describe('ShiftEnrollmentAction when the status query has no usable data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOffline = false;
    mockQueryResult = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    };
  });

  /**
   * #1537: `getShiftStatus` used to swallow a transient server failure into a `null`, which is a
   * *successful* response, so React Query cached and persisted it. The component read "no data" as
   * "no network" and told a demonstrably online user that a single Helferschicht was unreachable.
   */
  it('does not claim to be offline while the app is online', () => {
    mockQueryResult = { ...mockQueryResult, data: undefined };

    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.queryByText(OFFLINE_TEXT)).toBeNull();
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument();
  });

  it('offers a retry that refetches the shift status', () => {
    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('still reports offline when the app really is offline', () => {
    mockIsOffline = true;

    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.getByText(OFFLINE_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE_TEXT)).toBeNull();
  });

  it('shows the skeleton rather than an error while a cached value is being revalidated', () => {
    mockQueryResult = { ...mockQueryResult, isFetching: true };

    const { container } = render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.queryByText(UNAVAILABLE_TEXT)).toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  /**
   * The query client defaults to `refetchOnMount: false`, so without this override a bad cached
   * value survived every reopen of the shift — for the 7 days of its `gcTime`, across restarts,
   * because the cache is persisted to IndexedDB. A plain `true` would not be enough either: it
   * still respects the five-minute `staleTime`, so a freshly persisted empty value would outlive
   * the next visit.
   */
  it('refetches an empty cached status on mount without waiting for it to go stale', () => {
    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    const options = mockUseQuery.mock.calls[0]?.[1] as {
      refetchOnMount: (query: { state: { data: unknown } }) => boolean | string;
    };

    // eslint-disable-next-line unicorn/no-null -- the exact value the server used to hand back
    expect(options.refetchOnMount({ state: { data: null } })).toBe('always');
    expect(options.refetchOnMount({ state: { data: undefined } })).toBe('always');
    expect(options.refetchOnMount({ state: { data: { enrolledCount: 1 } } })).toBe(true);
  });
});

const WITHDRAWAL_CLOSED_TEXT = 'Abmelden nicht mehr möglich';

const enrolledStatus = (unenrollmentDeadline?: string): Record<string, unknown> => ({
  enrolledCount: 1,
  maxParticipants: 5,
  isEnrolled: true,
  isAdmin: false,
  isOrganiser: false,
  enableEnrolment: true,
  participants: [],
  unenrollmentDeadline,
});

/**
 * A helper used to be able to drop out of a shift seconds before it started. The window closes
 * `unenrollment_deadline_minutes` before the shift begins, and the card has to reflect that rather
 * than offer a button the server will refuse.
 */
describe('ShiftEnrollmentAction once the withdrawal deadline has passed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOffline = false;
  });

  it('still offers the withdrawal while the deadline is ahead', () => {
    mockQueryResult = {
      data: enrolledStatus('2100-01-01T00:00:00.000Z'),
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    };

    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.getByRole('button', { name: /Abmelden/ })).toBeInTheDocument();
    expect(screen.queryByText(WITHDRAWAL_CLOSED_TEXT)).toBeNull();
  });

  it('replaces the button with a hint once the deadline is behind us', () => {
    mockQueryResult = {
      data: enrolledStatus('2000-01-01T00:00:00.000Z'),
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    };

    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.getByText(WITHDRAWAL_CLOSED_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abmelden/ })).toBeNull();
  });

  /**
   * A status persisted before the field existed carries no deadline. Withdrawal stays open in that
   * case - the server still refuses a late one, and locking helpers out over a stale cache would
   * be the worse failure.
   */
  it('keeps the withdrawal available when the cached status carries no deadline', () => {
    mockQueryResult = {
      data: enrolledStatus(),
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    };

    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(screen.getByRole('button', { name: /Abmelden/ })).toBeInTheDocument();
  });
});
