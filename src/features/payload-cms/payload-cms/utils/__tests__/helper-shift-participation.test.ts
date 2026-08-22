import type {
  HelperShiftEnrollment,
  HelperShiftParticipant,
  HelperShiftSummary,
} from '@/features/payload-cms/payload-cms/utils/helper-shift-participation';
import {
  aggregateHelperShiftParticipation,
  parseTimeSlotHours,
  splitFullName,
} from '@/features/payload-cms/payload-cms/utils/helper-shift-participation';

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

describe('aggregateHelperShiftParticipation', () => {
  const shifts: HelperShiftSummary[] = [
    { id: 'shift-a', title: 'Küche Mittag', date: '2027-07-25', time: '12:00 - 14:00' },
    { id: 'shift-b', title: 'Abwasch', date: '2027-07-25', time: '18:00 - 20:30' },
    { id: 'shift-c', title: 'Aufbau', date: '2027-07-24', time: '08:00 - 12:00' },
  ];

  const participants: HelperShiftParticipant[] = [
    { id: 'user-1', fullName: 'Anna Meier', nickname: 'Bambi' },
    { id: 'user-2', fullName: 'Hans von Gunten', nickname: 'Specht' },
    // eslint-disable-next-line unicorn/no-null
    { id: 'user-3', fullName: 'Lea Zwahlen', nickname: null },
  ];

  it('sums the hours and lists the shift titles chronologically', () => {
    const enrollments: HelperShiftEnrollment[] = [
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-b' },
      { userId: 'user-1', courseId: 'shift-c' },
    ];

    const [row] = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    expect(row).toEqual({
      userId: 'user-1',
      firstName: 'Anna',
      lastName: 'Meier',
      nickname: 'Bambi',
      shiftCount: 3,
      totalHours: 8.5,
      shiftTitles: 'Aufbau, Küche Mittag, Abwasch',
    });
  });

  it('only includes users with at least one shift', () => {
    const enrollments: HelperShiftEnrollment[] = [{ userId: 'user-2', courseId: 'shift-c' }];

    const rows = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe('user-2');
    expect(rows[0]?.lastName).toBe('von Gunten');
  });

  it('ignores enrollments pointing at unknown shifts or unknown users', () => {
    const enrollments: HelperShiftEnrollment[] = [
      { userId: 'user-1', courseId: 'deleted-shift' },
      { userId: 'ghost-user', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-a' },
    ];

    const rows = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'user-1', shiftCount: 1, totalHours: 2 });
  });

  it('renders a missing nickname as an empty cell', () => {
    const enrollments: HelperShiftEnrollment[] = [{ userId: 'user-3', courseId: 'shift-a' }];

    const rows = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    expect(rows[0]?.nickname).toBe('');
  });

  it('sorts rows by last name, then first name', () => {
    const enrollments: HelperShiftEnrollment[] = [
      { userId: 'user-3', courseId: 'shift-a' },
      { userId: 'user-1', courseId: 'shift-a' },
      { userId: 'user-2', courseId: 'shift-a' },
    ];

    const rows = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    expect(rows.map((row) => row.lastName)).toEqual(['Meier', 'von Gunten', 'Zwahlen']);
  });

  it('returns an empty list when nobody is enrolled', () => {
    expect(aggregateHelperShiftParticipation({ shifts, enrollments: [], participants })).toEqual(
      [],
    );
  });

  it('skips shifts with an unparsable time slot but still lists their title', () => {
    const brokenShifts: HelperShiftSummary[] = [
      { id: 'shift-x', title: 'Springer', date: '2027-07-25', time: 'nach Absprache' },
    ];
    const enrollments: HelperShiftEnrollment[] = [{ userId: 'user-1', courseId: 'shift-x' }];

    const rows = aggregateHelperShiftParticipation({
      shifts: brokenShifts,
      enrollments,
      participants,
    });

    expect(rows[0]).toMatchObject({ totalHours: 0, shiftCount: 1, shiftTitles: 'Springer' });
  });
});
