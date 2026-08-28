import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { selectTodaysDashboardEvents } from '@/features/schedule/utils/dashboard-events';

const now = new Date('2027-07-24T09:00:00');
const TODAY_ISO = '2027-07-24';
const TOMORROW_ISO = '2027-07-25';

const makeEntry = (
  overrides: Partial<CampScheduleEntryFrontendType> & { id: string },
): CampScheduleEntryFrontendType =>
  ({
    title: 'Some Workshop',
    timeslot: { date: TODAY_ISO, time: '10:00 - 11:00' },
    // eslint-disable-next-line unicorn/no-null
    location: null,
    ...overrides,
  }) as CampScheduleEntryFrontendType;

const makeShift = (
  overrides: Partial<HelperShiftFrontendType> & { id: string },
): HelperShiftFrontendType => ({
  title: 'Some Shift',
  description: 'Some description',
  timeslot: { date: TODAY_ISO, time: '08:00 - 12:00' },
  organiser: [],
  ...overrides,
});

const select = (
  overrides: Partial<Parameters<typeof selectTodaysDashboardEvents>[0]> = {},
): ReturnType<typeof selectTodaysDashboardEvents> =>
  selectTodaysDashboardEvents({
    scheduleEntries: [],
    starredEntryIds: new Set<string>(),
    shifts: [],
    enrolledShiftIds: [],
    organisedShiftIds: [],
    now,
    limit: 3,
    ...overrides,
  });

describe('selectTodaysDashboardEvents', () => {
  it('keeps only the starred schedule entries of today', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'starred-today' }),
        makeEntry({ id: 'unstarred-today' }),
        makeEntry({ id: 'starred-tomorrow', timeslot: { date: TOMORROW_ISO, time: '10:00' } }),
      ],
      starredEntryIds: new Set(['starred-today', 'starred-tomorrow']),
    });

    expect(events.map((event) => event.id)).toEqual(['starred-today']);
  });

  it('shows a shift the user is enrolled in', () => {
    const events = select({
      shifts: [makeShift({ id: 'shift-1' }), makeShift({ id: 'shift-2' })],
      enrolledShiftIds: ['shift-1'],
    });

    expect(events.map((event) => event.id)).toEqual(['shift-1']);
    expect(events[0]?.isShift).toBe(true);
    expect(events[0]?.href).toBe('/app/helper-portal');
  });

  it('shows a shift the user organises without an enrolment', () => {
    const events = select({
      shifts: [makeShift({ id: 'shift-1' })],
      organisedShiftIds: ['shift-1'],
    });

    expect(events.map((event) => event.id)).toEqual(['shift-1']);
  });

  it('lists a shift the user both organises and is enrolled in exactly once', () => {
    const events = select({
      shifts: [makeShift({ id: 'shift-1' })],
      enrolledShiftIds: ['shift-1'],
      organisedShiftIds: ['shift-1'],
    });

    expect(events).toHaveLength(1);
  });

  it('hides shifts of another day', () => {
    const events = select({
      shifts: [makeShift({ id: 'shift-1', timeslot: { date: TOMORROW_ISO, time: '08:00' } })],
      enrolledShiftIds: ['shift-1'],
    });

    expect(events).toEqual([]);
  });

  it('merges entries and shifts into one chronological list', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'entry-late', timeslot: { date: TODAY_ISO, time: '14:00 - 15:00' } }),
        makeEntry({ id: 'entry-early', timeslot: { date: TODAY_ISO, time: '09:00 - 10:00' } }),
      ],
      starredEntryIds: new Set(['entry-late', 'entry-early']),
      shifts: [
        makeShift({ id: 'shift-noon', timeslot: { date: TODAY_ISO, time: '12:00 - 13:00' } }),
      ],
      enrolledShiftIds: ['shift-noon'],
    });

    expect(events.map((event) => event.id)).toEqual(['entry-early', 'shift-noon', 'entry-late']);
  });

  it('caps the list at the requested limit, counting only what is still ahead', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'a', timeslot: { date: TODAY_ISO, time: '09:00 - 10:00' } }),
        makeEntry({ id: 'b', timeslot: { date: TODAY_ISO, time: '10:00 - 11:00' } }),
        makeEntry({ id: 'c', timeslot: { date: TODAY_ISO, time: '11:00 - 12:00' } }),
        makeEntry({ id: 'd', timeslot: { date: TODAY_ISO, time: '12:00 - 13:00' } }),
      ],
      starredEntryIds: new Set(['a', 'b', 'c', 'd']),
      limit: 3,
    });

    expect(events.map((event) => event.id)).toEqual(['a', 'b', 'c']);
  });

  it('hides the entries of today that already ended', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'over', timeslot: { date: TODAY_ISO, time: '07:00 - 08:30' } }),
        makeEntry({ id: 'running', timeslot: { date: TODAY_ISO, time: '08:00 - 10:00' } }),
        makeEntry({ id: 'upcoming', timeslot: { date: TODAY_ISO, time: '11:00 - 12:00' } }),
      ],
      starredEntryIds: new Set(['over', 'running', 'upcoming']),
    });

    expect(events.map((event) => event.id)).toEqual(['running', 'upcoming']);
  });

  it('hides a shift that already ended', () => {
    const events = select({
      shifts: [
        makeShift({ id: 'shift-over', timeslot: { date: TODAY_ISO, time: '05:00 - 08:00' } }),
        makeShift({ id: 'shift-next', timeslot: { date: TODAY_ISO, time: '13:00 - 17:00' } }),
      ],
      enrolledShiftIds: ['shift-over', 'shift-next'],
    });

    expect(events.map((event) => event.id)).toEqual(['shift-next']);
  });

  it('keeps an entry that ends exactly now', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'ending-now', timeslot: { date: TODAY_ISO, time: '08:00 - 09:00' } }),
      ],
      starredEntryIds: new Set(['ending-now']),
    });

    expect(events.map((event) => event.id)).toEqual(['ending-now']);
  });

  it('drops the first three entries once they are over and shows the next three', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'past-1', timeslot: { date: TODAY_ISO, time: '06:00 - 07:00' } }),
        makeEntry({ id: 'past-2', timeslot: { date: TODAY_ISO, time: '07:00 - 08:00' } }),
        makeEntry({ id: 'past-3', timeslot: { date: TODAY_ISO, time: '08:00 - 08:45' } }),
        makeEntry({ id: 'next-1', timeslot: { date: TODAY_ISO, time: '10:00 - 11:00' } }),
        makeEntry({ id: 'next-2', timeslot: { date: TODAY_ISO, time: '12:00 - 13:00' } }),
        makeEntry({ id: 'next-3', timeslot: { date: TODAY_ISO, time: '14:00 - 15:00' } }),
        makeEntry({ id: 'next-4', timeslot: { date: TODAY_ISO, time: '16:00 - 17:00' } }),
      ],
      starredEntryIds: new Set([
        'past-1',
        'past-2',
        'past-3',
        'next-1',
        'next-2',
        'next-3',
        'next-4',
      ]),
      limit: 3,
    });

    expect(events.map((event) => event.id)).toEqual(['next-1', 'next-2', 'next-3']);
  });

  it('keeps an entry whose time it cannot parse rather than hiding it', () => {
    const events = select({
      scheduleEntries: [
        makeEntry({ id: 'unparsable', timeslot: { date: TODAY_ISO, time: 'ganzer Tag' } }),
      ],
      starredEntryIds: new Set(['unparsable']),
    });

    expect(events.map((event) => event.id)).toEqual(['unparsable']);
  });

  it('resolves the location relationship and drops unpopulated ones', () => {
    const annotation = { id: 'loc-1', title: 'Zeltplatz' } as CampMapAnnotation;

    const events = select({
      scheduleEntries: [makeEntry({ id: 'entry', location: annotation })],
      starredEntryIds: new Set(['entry']),
      shifts: [makeShift({ id: 'shift', location: 'loc-1' })],
      enrolledShiftIds: ['shift'],
    });

    const byId = new Map(events.map((event) => [event.id, event]));
    expect(byId.get('entry')?.location).toBe(annotation);
    expect(byId.get('shift')?.location).toBeUndefined();
  });
});
