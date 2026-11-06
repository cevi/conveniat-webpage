/**
 * @jest-environment jsdom
 */

import { ParticipantList } from '@/features/schedule/components/participant-list';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

interface CourseStatus {
  enrolledCount: number;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  participants: { uuid: string; name: string }[];
}

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const organiserStatus = (overrides: Partial<CourseStatus> = {}): CourseStatus => ({
  enrolledCount: 2,
  isAdmin: true,
  enableEnrolment: true,
  hideList: false,
  participants: [
    { uuid: 'u1', name: 'Anna Muster' },
    { uuid: 'u2', name: 'Beat Beispiel' },
  ],
  ...overrides,
});

/** a status the server never answers, so the query stays loading */
const pending = (): Promise<never> => new Promise<never>(() => {});

/**
 * Renders the list against a test client whose `getCourseStatus` and `getShiftStatus` answer
 * with the given status, and returns the client so a test can see what reached the server.
 */
const renderList = (
  properties: React.ComponentProps<typeof ParticipantList>,
  answers: { course?: () => unknown; shift?: () => unknown } = {},
): RenderResult & TestTrpc => {
  const testTrpc = createTestTrpc({
    'schedule.getCourseStatus': answers.course ?? ((): unknown => organiserStatus()),
    'shifts.getShiftStatus': answers.shift ?? ((): unknown => organiserStatus()),
  });
  return Object.assign(
    render(<ParticipantList {...properties} />, { wrapper: testTrpc.wrapper }),
    testTrpc,
  );
};

describe('ParticipantList', () => {
  it('lists the enrolled participants with the enrolled count for an organiser', () => {
    renderList({ courseId: 'course-1', courseStatus: organiserStatus() });

    expect(screen.getByText('Teilnehmende (2)')).toBeInTheDocument();
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('Beat Beispiel')).toBeInTheDocument();
  });

  /**
   * The roster is organiser-only. `getCourseStatus` already withholds the names from anybody
   * else, but the component must not render a list either - otherwise mounting it on a
   * participant-facing surface would silently show an empty "Teilnehmer (12)" heading.
   */
  it('renders nothing for a user who does not organise the workshop', () => {
    const { container } = renderList({
      courseId: 'course-1',
      courseStatus: organiserStatus({ isAdmin: false, participants: [] }),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('reuses the status it was handed instead of firing its own query', async () => {
    const { calls } = renderList({ courseId: 'course-1', courseStatus: organiserStatus() });

    // let any query that would have started reach the link
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]);
  });

  it('fetches the status itself when rendered standalone', async () => {
    const { calls } = renderList({ courseId: 'course-1' });

    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();
    expect(calls).toEqual([{ path: 'schedule.getCourseStatus', input: { courseId: 'course-1' } }]);
  });

  it('renders an empty-state hint when nobody has enrolled yet', () => {
    renderList({
      courseId: 'course-1',
      courseStatus: organiserStatus({ enrolledCount: 0, participants: [] }),
    });

    expect(screen.getByText('Noch keine Teilnehmenden')).toBeInTheDocument();
  });

  /**
   * "Teilnehmerliste ausblenden" takes the roster out of the app entirely - not just for the
   * participants, but for the organiser too. With it on the list stays exclusive to the admin
   * panel, whose export never consults the flag.
   */
  it('renders nothing for an organiser once the list is hidden', () => {
    const { container } = renderList({
      courseId: 'course-1',
      courseStatus: organiserStatus({ hideList: true, participants: [] }),
    });

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The checkbox only materialises on courses saved after it was added, so older documents
   * carry `undefined`. That has to read as its `false` default - "not hidden" - rather than
   * withhold the roster from every course predating the field.
   */
  it('treats an unset hide flag as a visible list', () => {
    renderList({ courseId: 'course-1', courseStatus: organiserStatus({ hideList: null }) });

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  it('renders nothing when enrolment is disabled for the course', () => {
    const { container } = renderList({
      courseId: 'course-1',
      courseStatus: organiserStatus({ enableEnrolment: false }),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the standalone status is still loading', async () => {
    const { container, calls } = renderList({ courseId: 'course-1' }, { course: pending });

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * A helper shift is a different collection behind a different router, so `courseType` has to
   * route the standalone fetch - asking `schedule.getCourseStatus` for a shift id answers `null`,
   * which reads as "deleted" and would silently hide the roster from its organiser.
   */
  describe('on a helper shift', () => {
    it('asks the shifts router for the status and leaves the schedule query disabled', async () => {
      const { calls } = renderList({ courseId: 'shift-1', courseType: 'shift' });

      await screen.findByText('Anna Muster');
      expect(calls).toEqual([{ path: 'shifts.getShiftStatus', input: { shiftId: 'shift-1' } }]);
    });

    it('lists the enrolled helpers for the organiser of the shift', async () => {
      renderList({ courseId: 'shift-1', courseType: 'shift' });

      expect(await screen.findByText('Angemeldete Helfende (2)')).toBeInTheDocument();
      expect(screen.getByText('Anna Muster')).toBeInTheDocument();
      expect(screen.getByText('Beat Beispiel')).toBeInTheDocument();
    });

    it('renders nothing for a helper who does not organise the shift', async () => {
      const { container, queryClient, trpc } = renderList(
        { courseId: 'shift-1', courseType: 'shift' },
        { shift: () => organiserStatus({ isAdmin: false, participants: [] }) },
      );

      await waitFor(() =>
        expect(
          queryClient.getQueryData(trpc.shifts.getShiftStatus.queryKey({ shiftId: 'shift-1' })),
        ).toBeDefined(),
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('names the empty state after helpers rather than participants', async () => {
      renderList(
        { courseId: 'shift-1', courseType: 'shift' },
        { shift: () => organiserStatus({ enrolledCount: 0, participants: [] }) },
      );

      expect(await screen.findByText('Noch keine Helfenden angemeldet')).toBeInTheDocument();
    });

    /**
     * `getShiftStatus` answers `null` for a deleted shift, which is a *successful* response
     * rather than an error, so it arrives as data and must not crash the roster.
     */
    it('renders nothing for a shift that no longer exists', async () => {
      const { container, queryClient, trpc } = renderList(
        { courseId: 'gone', courseType: 'shift' },
        { shift: () => null },
      );

      await waitFor(() =>
        expect(
          queryClient.getQueryState(trpc.shifts.getShiftStatus.queryKey({ shiftId: 'gone' }))
            ?.status,
        ).toBe('success'),
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
