import type {
  CourseAssignment,
  CourseOrganiserDocument,
  CourseParticipant,
  CourseSummary,
} from '@/features/payload-cms/payload-cms/utils/course-participation';
import {
  aggregateCourseParticipation,
  extractOrganiserAssignments,
  parseTimeSlotHours,
  splitFullName,
} from '@/features/payload-cms/payload-cms/utils/course-participation';

describe('parseTimeSlotHours', () => {
  it('returns the duration of a well formed slot', () => {
    expect(parseTimeSlotHours('12:00 - 14:00')).toBe(2);
    expect(parseTimeSlotHours('08:00 - 18:00')).toBe(10);
  });

  it('supports fractional durations', () => {
    expect(parseTimeSlotHours('12:00 - 13:30')).toBe(1.5);
    expect(parseTimeSlotHours('09:15 - 09:45')).toBe(0.5);
  });

  it('treats a slot ending before it starts as crossing midnight', () => {
    expect(parseTimeSlotHours('22:00 - 02:00')).toBe(4);
    expect(parseTimeSlotHours('23:30 - 00:30')).toBe(1);
  });

  it('tolerates additional whitespace', () => {
    expect(parseTimeSlotHours('  12:00-14:00 ')).toBe(2);
  });

  it('returns 0 for unparsable or missing slots', () => {
    expect(parseTimeSlotHours('12:00')).toBe(0);
    expect(parseTimeSlotHours('25:00 - 26:00')).toBe(0);
    expect(parseTimeSlotHours('nachmittags')).toBe(0);
    // eslint-disable-next-line unicorn/no-null
    expect(parseTimeSlotHours(null)).toBe(0);
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(parseTimeSlotHours(undefined)).toBe(0);
  });

  it('returns 0 for a slot of zero length', () => {
    expect(parseTimeSlotHours('12:00 - 12:00')).toBe(0);
  });
});

describe('splitFullName', () => {
  it('splits a simple first/last name pair', () => {
    expect(splitFullName('Hans Müller')).toEqual({ firstName: 'Hans', lastName: 'Müller' });
  });

  it('keeps compound first names together', () => {
    expect(splitFullName('Anna Maria Meier')).toEqual({
      firstName: 'Anna Maria',
      lastName: 'Meier',
    });
  });

  it('attaches name particles to the last name', () => {
    expect(splitFullName('Hans von Gunten')).toEqual({
      firstName: 'Hans',
      lastName: 'von Gunten',
    });
    expect(splitFullName('Marie de la Croix')).toEqual({
      firstName: 'Marie',
      lastName: 'de la Croix',
    });
  });

  it('treats a single token as a last name', () => {
    expect(splitFullName('Müller')).toEqual({ firstName: '', lastName: 'Müller' });
  });

  it('collapses surrounding and repeated whitespace', () => {
    expect(splitFullName('  Hans   Müller  ')).toEqual({ firstName: 'Hans', lastName: 'Müller' });
  });

  it('returns empty names for missing input', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(splitFullName(undefined)).toEqual({ firstName: '', lastName: '' });
    // eslint-disable-next-line unicorn/no-null
    expect(splitFullName(null)).toEqual({ firstName: '', lastName: '' });
    expect(splitFullName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('aggregateCourseParticipation', () => {
  const courses: CourseSummary[] = [
    { id: 'shift-a', title: 'Küche Mittag', date: '2027-07-25', time: '12:00 - 14:00' },
    { id: 'shift-b', title: 'Abwasch', date: '2027-07-25', time: '18:00 - 20:30' },
    { id: 'shift-c', title: 'Aufbau', date: '2027-07-24', time: '08:00 - 12:00' },
  ];

  const participants: CourseParticipant[] = [
    { id: 'user-1', fullName: 'Anna Meier', nickname: 'Bambi', email: 'anna@example.org' },
    { id: 'user-2', fullName: 'Hans von Gunten', nickname: 'Specht', email: 'hans@example.org' },
    // eslint-disable-next-line unicorn/no-null
    { id: 'user-3', fullName: 'Lea Zwahlen', nickname: null, email: 'lea@example.org' },
  ];

  it('sums the hours and lists the course titles chronologically', () => {
    const assignments: CourseAssignment[] = [
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-b' },
      { userId: 'user-1', courseId: 'shift-c' },
    ];

    const [row] = aggregateCourseParticipation({ courses, assignments, participants });

    expect(row).toEqual({
      userId: 'user-1',
      firstName: 'Anna',
      lastName: 'Meier',
      nickname: 'Bambi',
      email: 'anna@example.org',
      courseCount: 3,
      totalHours: 8.5,
      courseTitles: 'Aufbau, Küche Mittag, Abwasch',
    });
  });

  it('only includes users with at least one course', () => {
    const assignments: CourseAssignment[] = [{ userId: 'user-2', courseId: 'shift-c' }];

    const rows = aggregateCourseParticipation({ courses, assignments, participants });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe('user-2');
    expect(rows[0]?.lastName).toBe('von Gunten');
  });

  it('ignores assignments pointing at unknown courses or unknown users', () => {
    const assignments: CourseAssignment[] = [
      { userId: 'user-1', courseId: 'deleted-shift' },
      { userId: 'ghost-user', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-a' },
    ];

    const rows = aggregateCourseParticipation({ courses, assignments, participants });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'user-1', courseCount: 1, totalHours: 2 });
  });

  it('renders a missing nickname as an empty cell', () => {
    const assignments: CourseAssignment[] = [{ userId: 'user-3', courseId: 'shift-a' }];

    const rows = aggregateCourseParticipation({ courses, assignments, participants });

    expect(rows[0]?.nickname).toBe('');
  });

  it('carries the email address of every helper', () => {
    const assignments: CourseAssignment[] = [
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-b' },
    ];

    const rows = aggregateCourseParticipation({ courses, assignments, participants });

    expect(rows.map((row) => row.email)).toEqual(['anna@example.org', 'hans@example.org']);
  });

  it('renders a missing email as an empty cell', () => {
    const assignments: CourseAssignment[] = [{ userId: 'user-4', courseId: 'shift-a' }];

    const rows = aggregateCourseParticipation({
      courses,
      assignments,
      participants: [{ id: 'user-4', fullName: 'Tim Roth', nickname: 'Fuchs' }],
    });

    expect(rows[0]?.email).toBe('');
  });

  it('sorts rows by last name, then first name', () => {
    const assignments: CourseAssignment[] = [
      { userId: 'user-3', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-a' },
    ];

    const rows = aggregateCourseParticipation({ courses, assignments, participants });

    expect(rows.map((row) => row.lastName)).toEqual(['Meier', 'von Gunten', 'Zwahlen']);
  });

  it('returns an empty list when nobody is assigned', () => {
    expect(aggregateCourseParticipation({ courses, assignments: [], participants })).toEqual([]);
  });

  it('skips courses with an unparsable time slot but still lists their title', () => {
    const brokenCourses: CourseSummary[] = [
      { id: 'shift-x', title: 'Springer', date: '2027-07-25', time: 'nach Absprache' },
    ];
    const assignments: CourseAssignment[] = [{ userId: 'user-1', courseId: 'shift-x' }];

    const rows = aggregateCourseParticipation({
      courses: brokenCourses,
      assignments,
      participants,
    });

    expect(rows[0]).toMatchObject({ totalHours: 0, courseCount: 1, courseTitles: 'Springer' });
  });
});

describe('extractOrganiserAssignments', () => {
  it('turns documents into courses and one assignment per organiser', () => {
    const documents: CourseOrganiserDocument[] = [
      {
        id: 'shift-a',
        title: 'Küche Mittag',
        timeslot: { date: '2027-07-25', time: '12:00 - 14:00' },
        organiser: ['user-1', 'user-2'],
      },
      {
        id: 'shift-b',
        title: 'Abwasch',
        timeslot: { date: '2027-07-25', time: '18:00 - 20:30' },
        organiser: ['user-2'],
      },
    ];

    const { courses, assignments } = extractOrganiserAssignments(documents);

    expect(courses).toEqual([
      { id: 'shift-a', title: 'Küche Mittag', date: '2027-07-25', time: '12:00 - 14:00' },
      { id: 'shift-b', title: 'Abwasch', date: '2027-07-25', time: '18:00 - 20:30' },
    ]);
    expect(assignments).toEqual([
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-b' },
    ]);
  });

  it('accepts populated organiser relations', () => {
    const { assignments } = extractOrganiserAssignments([
      {
        id: 'shift-a',
        title: 'Küche Mittag',
        timeslot: { date: '2027-07-25', time: '12:00 - 14:00' },
        organiser: [{ id: 'user-1' }, 'user-2'],
      },
    ]);

    expect(assignments).toEqual([
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-a' },
    ]);
  });

  it('counts an organiser listed twice on the same course only once', () => {
    const { assignments } = extractOrganiserAssignments([
      {
        id: 'shift-a',
        title: 'Küche Mittag',
        timeslot: { date: '2027-07-25', time: '12:00 - 14:00' },
        organiser: ['user-1', { id: 'user-1' }],
      },
    ]);

    expect(assignments).toEqual([{ userId: 'user-1', courseId: 'shift-a' }]);
  });

  it('keeps courses without organisers, but yields no assignment for them', () => {
    const { courses, assignments } = extractOrganiserAssignments([
      // eslint-disable-next-line unicorn/no-null
      { id: 'shift-a', title: 'Küche Mittag', timeslot: { date: '2027-07-25' }, organiser: null },
      { id: 'shift-b', title: 'Abwasch' },
    ]);

    expect(courses).toHaveLength(2);
    expect(courses[1]).toEqual({
      id: 'shift-b',
      title: 'Abwasch',
      date: undefined,
      time: undefined,
    });
    expect(assignments).toEqual([]);
  });

  it('feeds straight into the aggregation', () => {
    const { courses, assignments } = extractOrganiserAssignments([
      {
        id: 'shift-a',
        title: 'Küche Mittag',
        timeslot: { date: '2027-07-25', time: '12:00 - 14:00' },
        organiser: ['user-1'],
      },
      {
        id: 'shift-c',
        title: 'Aufbau',
        timeslot: { date: '2027-07-24', time: '08:00 - 12:00' },
        organiser: ['user-1'],
      },
    ]);

    const rows = aggregateCourseParticipation({
      courses,
      assignments,
      participants: [
        { id: 'user-1', fullName: 'Anna Meier', nickname: 'Bambi', email: 'anna@example.org' },
      ],
    });

    expect(rows).toEqual([
      {
        userId: 'user-1',
        firstName: 'Anna',
        lastName: 'Meier',
        nickname: 'Bambi',
        email: 'anna@example.org',
        courseCount: 2,
        totalHours: 6,
        courseTitles: 'Aufbau, Küche Mittag',
      },
    ]);
  });
});
