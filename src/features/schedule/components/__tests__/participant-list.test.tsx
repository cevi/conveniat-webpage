/**
 * @jest-environment jsdom
 */

import { ParticipantList } from '@/features/schedule/components/participant-list';
import { render, screen } from '@testing-library/react';

interface CourseStatus {
  enrolledCount: number;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  participants: { uuid: string; name: string }[];
}

let mockQueryResult: { data: CourseStatus | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const mockUseQuery = jest.fn<typeof mockQueryResult, [unknown, unknown]>(() => mockQueryResult);

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    schedule: {
      getCourseStatus: {
        useQuery: (input: unknown, options: unknown): unknown => mockUseQuery(input, options),
      },
    },
  },
}));

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

describe('ParticipantList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryResult = { data: undefined, isLoading: false };
  });

  it('lists the enrolled participants with the enrolled count for an organiser', () => {
    render(<ParticipantList courseId="course-1" courseStatus={organiserStatus()} />);

    expect(screen.getByText('Teilnehmer (2)')).toBeInTheDocument();
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('Beat Beispiel')).toBeInTheDocument();
  });

  /**
   * The roster is organiser-only. `getCourseStatus` already withholds the names from anybody
   * else, but the component must not render a list either - otherwise mounting it on a
   * participant-facing surface would silently show an empty "Teilnehmer (12)" heading.
   */
  it('renders nothing for a user who does not organise the workshop', () => {
    const { container } = render(
      <ParticipantList
        courseId="course-1"
        courseStatus={organiserStatus({ isAdmin: false, participants: [] })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('reuses the status it was handed instead of firing its own query', () => {
    render(<ParticipantList courseId="course-1" courseStatus={organiserStatus()} />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      { courseId: 'course-1' },
      expect.objectContaining({ enabled: false }),
    );
  });

  it('fetches the status itself when rendered standalone', () => {
    mockQueryResult = { data: organiserStatus(), isLoading: false };

    render(<ParticipantList courseId="course-1" />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      { courseId: 'course-1' },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  it('renders an empty-state hint when nobody has enrolled yet', () => {
    render(
      <ParticipantList
        courseId="course-1"
        courseStatus={organiserStatus({ enrolledCount: 0, participants: [] })}
      />,
    );

    expect(screen.getByText('Noch keine Teilnehmer')).toBeInTheDocument();
  });

  /**
   * "Teilnehmerliste ausblenden" takes the roster out of the app entirely - not just for the
   * participants, but for the organiser too. With it on the list stays exclusive to the admin
   * panel, whose export never consults the flag.
   */
  it('renders nothing for an organiser once the list is hidden', () => {
    const { container } = render(
      <ParticipantList
        courseId="course-1"
        courseStatus={organiserStatus({ hideList: true, participants: [] })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The checkbox only materialises on courses saved after it was added, so older documents
   * carry `undefined`. That has to read as its `false` default - "not hidden" - rather than
   * withhold the roster from every course predating the field.
   */
  it('treats an unset hide flag as a visible list', () => {
    render(
      <ParticipantList
        courseId="course-1"
        // eslint-disable-next-line unicorn/no-null
        courseStatus={organiserStatus({ hideList: null })}
      />,
    );

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });

  it('renders nothing when enrolment is disabled for the course', () => {
    const { container } = render(
      <ParticipantList
        courseId="course-1"
        courseStatus={organiserStatus({ enableEnrolment: false })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the standalone status is still loading', () => {
    mockQueryResult = { data: undefined, isLoading: true };

    const { container } = render(<ParticipantList courseId="course-1" />);

    expect(container).toBeEmptyDOMElement();
  });
});
