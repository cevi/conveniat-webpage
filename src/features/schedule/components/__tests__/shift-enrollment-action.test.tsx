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
   * because the cache is persisted to IndexedDB.
   */
  it('revalidates a stale cached status on mount', () => {
    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      { shiftId: 'shift-1' },
      expect.objectContaining({ refetchOnMount: true }),
    );
  });
});
