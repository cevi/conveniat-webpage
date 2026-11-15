/**
 * @jest-environment jsdom
 */

import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import type { ProcedureHandler, TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import type { RenderResult } from '@testing-library/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockIsOffline = false;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => !mockIsOffline,
}));

jest.mock('next-auth/react', () => ({
  useSession: (): { status: string } => ({ status: 'authenticated' }),
}));

// the switch dialog has data of its own, and nothing here opens it
jest.mock('@/features/schedule/components/shift-conflict-dialog', () => ({
  ShiftConflictDialog: (): undefined => undefined,
}));

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const OFFLINE_TEXT = 'Offline – Anmeldung nicht möglich.';
const UNAVAILABLE_TEXT = 'Anmeldestatus konnte nicht geladen werden.';

/** a request the server never answers, so it stays in flight */
const pending = (): Promise<never> => new Promise<never>(() => {});

/** the cache key of the status of `shift-1` */
const statusKey = (testTrpc: TestTrpc): readonly unknown[] =>
  testTrpc.trpc.shifts.getShiftStatus.queryKey({ shiftId: 'shift-1' });

const renderAction = (
  handlers: Record<string, ProcedureHandler>,
  properties: Partial<React.ComponentProps<typeof ShiftEnrollmentAction>> = {},
  seed?: (testTrpc: TestTrpc) => void,
): RenderResult & TestTrpc => {
  // a person in one Hof unless a test says otherwise: the sheet then asks nothing about it
  const testTrpc = createTestTrpc({
    'shifts.getMyEnrolmentHoefe': () => [{ id: 'hof-uster', name: 'Cevi Uster' }],
    ...handlers,
  });
  seed?.(testTrpc);
  return Object.assign(
    render(<ShiftEnrollmentAction shiftId="shift-1" enableEnrolment {...properties} />, {
      wrapper: testTrpc.wrapper,
    }),
    testTrpc,
  );
};

/** Taps "Einschreiben" and confirms in the sheet that opens, the way a helper enrols. */
const enrol = async (): Promise<void> => {
  fireEvent.click(await screen.findByRole('button', { name: /Einschreiben/ }));
  const confirm = await screen.findByRole('button', { name: /Verbindlich anmelden/ });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
};

const statusCalls = (testTrpc: TestTrpc): TestTrpc['calls'] =>
  testTrpc.calls.filter((call) => call.path === 'shifts.getShiftStatus');

describe('ShiftEnrollmentAction when the status query has no usable data', () => {
  beforeEach(() => {
    mockIsOffline = false;
  });

  /**
   * #1537: `getShiftStatus` used to swallow a transient server failure into a `null`, which is a
   * *successful* response, so React Query cached and persisted it. The component read "no data" as
   * "no network" and told a demonstrably online user that a single Helferschicht was unreachable.
   */
  it('does not claim to be offline while the app is online', async () => {
    renderAction({ 'shifts.getShiftStatus': () => null });

    expect(await screen.findByText(UNAVAILABLE_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_TEXT)).toBeNull();
  });

  it('offers a retry that refetches the shift status', async () => {
    const getShiftStatus = jest.fn(() => null);
    renderAction({ 'shifts.getShiftStatus': getShiftStatus });

    fireEvent.click(await screen.findByRole('button', { name: /Erneut versuchen/ }));

    await waitFor(() => expect(getShiftStatus).toHaveBeenCalledTimes(2));
    expect(getShiftStatus).toHaveBeenLastCalledWith({ shiftId: 'shift-1' });
  });

  it('still reports offline when the app really is offline', async () => {
    mockIsOffline = true;

    renderAction({ 'shifts.getShiftStatus': () => null });

    expect(await screen.findByText(OFFLINE_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE_TEXT)).toBeNull();
  });

  it('shows the skeleton rather than an error while a cached value is being revalidated', async () => {
    const testTrpc = renderAction({ 'shifts.getShiftStatus': pending }, {}, (t) =>
      t.queryClient.setQueryData(statusKey(t), null),
    );

    await waitFor(() => expect(statusCalls(testTrpc)).toHaveLength(1));
    expect(screen.queryByText(UNAVAILABLE_TEXT)).toBeNull();
    expect(testTrpc.container.querySelector('.animate-pulse')).not.toBeNull();
  });

  /**
   * The query client defaults to `refetchOnMount: false`, so without this override a bad cached
   * value survived every reopen of the shift — for the 7 days of its `gcTime`, across restarts,
   * because the cache is persisted to IndexedDB. A plain `true` would not be enough either: it
   * still respects the five-minute `staleTime`, so a freshly persisted empty value would outlive
   * the next visit.
   */
  describe('refetches an empty cached status on mount without waiting for it to go stale', () => {
    // the exact value the server used to hand back
    it('refetches a fresh cached null', async () => {
      const testTrpc = renderAction({ 'shifts.getShiftStatus': pending }, {}, (t) =>
        t.queryClient.setQueryData(statusKey(t), null),
      );

      await waitFor(() => expect(statusCalls(testTrpc)).toHaveLength(1));
    });

    it('fetches when nothing is cached', async () => {
      const testTrpc = renderAction({ 'shifts.getShiftStatus': pending });

      await waitFor(() => expect(statusCalls(testTrpc)).toHaveLength(1));
    });

    it('leaves a fresh cached status to its staleness schedule', async () => {
      const testTrpc = renderAction({ 'shifts.getShiftStatus': pending }, {}, (t) =>
        t.queryClient.setQueryData(statusKey(t), enrolledStatus()),
      );

      expect(await screen.findByRole('button', { name: /Abmelden/ })).toBeInTheDocument();
      expect(statusCalls(testTrpc)).toEqual([]);
    });
  });
});

const WITHDRAWAL_CLOSED_TEXT = 'Abmeldefrist abgelaufen';

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
    mockIsOffline = false;
  });

  it('still offers the withdrawal while the deadline is ahead', async () => {
    renderAction({ 'shifts.getShiftStatus': () => enrolledStatus('2100-01-01T00:00:00.000Z') });

    expect(await screen.findByRole('button', { name: /Abmelden/ })).toBeInTheDocument();
    expect(screen.queryByText(WITHDRAWAL_CLOSED_TEXT)).toBeNull();
  });

  it('replaces the button with a hint once the deadline is behind us', async () => {
    renderAction({ 'shifts.getShiftStatus': () => enrolledStatus('2000-01-01T00:00:00.000Z') });

    expect(await screen.findByText(WITHDRAWAL_CLOSED_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abmelden/ })).toBeNull();
  });

  /**
   * A status persisted before the field existed carries no deadline. Withdrawal stays open in that
   * case - the server still refuses a late one, and locking helpers out over a stale cache would
   * be the worse failure.
   */
  it('keeps the withdrawal available when the cached status carries no deadline', async () => {
    renderAction({ 'shifts.getShiftStatus': pending }, {}, (t) =>
      t.queryClient.setQueryData(statusKey(t), enrolledStatus()),
    );

    expect(await screen.findByRole('button', { name: /Abmelden/ })).toBeInTheDocument();
  });
});

describe('ShiftEnrollmentAction after a failed enrolment', () => {
  const openStatus = { ...enrolledStatus('2100-01-01T00:00:00.000Z'), isEnrolled: false };

  beforeEach(() => {
    mockIsOffline = false;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['card', 'detail'] as const)('says why under the button (%s)', async (variant) => {
    // the refusal refetches the status; until that answers, the line is all the helper has
    const testTrpc = renderAction(
      {
        'shifts.getShiftStatus': jest
          .fn()
          .mockReturnValueOnce(openStatus)
          .mockImplementation(pending),
        'shifts.enrollInShift': () => {
          throw testTrpcError('BAD_REQUEST', { reason: 'shiftFull' });
        },
      },
      { variant },
    );

    await enrol();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dieser Schichteinsatz ist bereits ausgebucht.',
    );
    expect(testTrpc.calls).toContainEqual({
      path: 'shifts.enrollInShift',
      input: { shiftId: 'shift-1' },
    });
  });

  it('leaves it to the refreshed status once that says the shift is full', async () => {
    const getShiftStatus = jest
      .fn()
      .mockReturnValueOnce(openStatus)
      .mockReturnValue({ ...enrolledStatus(), isEnrolled: false, enrolledCount: 5 });
    renderAction({
      'shifts.getShiftStatus': getShiftStatus,
      'shifts.enrollInShift': () => {
        throw testTrpcError('BAD_REQUEST', { reason: 'shiftFull' });
      },
    });

    await enrol();

    // the refusal refetches the status, which now says the shift is full
    await waitFor(() => expect(getShiftStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
    // the capacity row says it is full; no control is left that only looks tappable
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says there is no connection when the request never arrived', async () => {
    renderAction({
      'shifts.getShiftStatus': () => openStatus,
      'shifts.enrollInShift': () => {
        throw new Error('Failed to fetch');
      },
    });

    await enrol();

    expect(await screen.findByRole('alert')).toHaveTextContent('Keine Verbindung.');
  });
});

describe('ShiftEnrollmentAction enrol sheet', () => {
  const openStatus = { ...enrolledStatus('2100-01-01T00:00:00.000Z'), isEnrolled: false };

  beforeEach(() => {
    mockIsOffline = false;
  });

  it('asks before it enrols, and enrols nobody on the first tap', async () => {
    const testTrpc = renderAction({
      'shifts.getShiftStatus': () => openStatus,
      'shifts.enrollInShift': () => ({ success: true }),
    });

    fireEvent.click(await screen.findByRole('button', { name: /Einschreiben/ }));

    expect(await screen.findByRole('button', { name: /Verbindlich anmelden/ })).toBeVisible();
    expect(testTrpc.calls.some((call) => call.path === 'shifts.enrollInShift')).toBe(false);
  });

  it('lets a person in two Höfe choose which one the shift counts for', async () => {
    const testTrpc = renderAction({
      'shifts.getShiftStatus': () => openStatus,
      'shifts.getMyEnrolmentHoefe': () => [
        { id: 'hof-uster', name: 'Cevi Uster' },
        { id: 'hof-zueri', name: 'Züri 11' },
      ],
      'shifts.enrollInShift': () => ({ success: true }),
    });

    fireEvent.click(await screen.findByRole('button', { name: /Einschreiben/ }));
    const confirm = await screen.findByRole('button', { name: /Verbindlich anmelden/ });
    fireEvent.click(await screen.findByRole('button', { name: 'Züri 11' }));
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(testTrpc.calls).toContainEqual({
        path: 'shifts.enrollInShift',
        input: { shiftId: 'shift-1', hofId: 'hof-zueri' },
      }),
    );
  });

  it('holds back a person in two Höfe until they chose one', async () => {
    renderAction({
      'shifts.getShiftStatus': () => openStatus,
      'shifts.getMyEnrolmentHoefe': () => [
        { id: 'hof-uster', name: 'Cevi Uster' },
        { id: 'hof-zueri', name: 'Züri 11' },
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: /Einschreiben/ }));
    await screen.findByRole('button', { name: 'Züri 11' });

    expect(screen.getByRole('button', { name: /Verbindlich anmelden/ })).toBeDisabled();
  });
});
