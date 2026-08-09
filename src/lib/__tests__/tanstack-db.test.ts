/* eslint-disable unicorn/no-null -- these tests exist precisely because Payload returns `null`
   for a relationship whose target document was deleted. */
import { scheduleEntriesCollection, type ScheduleEntryRecord } from '@/lib/tanstack-db';

/**
 * Builds an entry as the *API* can deliver it. The overrides are deliberately untyped: these
 * tests cover payloads the compiler believes are impossible but the server actually returns.
 */
const baseEntry = (overrides: Record<string, unknown> = {}): ScheduleEntryRecord => ({
  id: 'entry-1',
  title: 'Lagerhöck',
  description: { root: { type: 'root', children: [] } },
  timeslot: { date: '2027-07-24', time: '14:00 - 16:00' },
  location: { id: 'loc-1', title: 'Hauptplatz' },
  ...overrides,
});

describe('scheduleEntriesCollection', () => {
  beforeEach(async () => {
    await scheduleEntriesCollection.preload();
    const storedIds = [...scheduleEntriesCollection.state.keys()];
    for (const id of storedIds) {
      scheduleEntriesCollection.delete(id);
    }
  });

  /**
   * A rejected entry throws a `SchemaValidationError` out of the sync effect, which React forwards
   * to the nearest error boundary - replacing the whole schedule page with the error screen.
   */
  it.each([
    ['a dangling location', { location: null }],
    ['an unpopulated location', { location: 'loc-1' }],
    ['a dangling organiser', { organiser: [undefined] }],
    ['a dangling category', { category: null }],
  ])('accepts an entry with %s', (_label, overrides) => {
    expect(() => scheduleEntriesCollection.insert(baseEntry(overrides))).not.toThrow();
    expect(scheduleEntriesCollection.get('entry-1')).toBeDefined();
  });

  it('accepts an entry without a location', () => {
    const entry = baseEntry();
    delete entry.location;

    expect(() => scheduleEntriesCollection.insert(entry)).not.toThrow();
    expect(scheduleEntriesCollection.get('entry-1')).toBeDefined();
  });

  it('drops dangling organisers instead of storing them', () => {
    scheduleEntriesCollection.insert(
      baseEntry({
        organiser: [undefined, { fullName: 'Test Person', email: 'test@example.com' }],
      }),
    );

    expect(scheduleEntriesCollection.get('entry-1')?.organiser).toEqual([
      { fullName: 'Test Person', email: 'test@example.com' },
    ]);
  });

  /**
   * TanStack DB derives the mutation from property assignments on the draft and ignores the
   * callback's return value - returning a new object silently produced an empty change set, so
   * records written by an older app version were never refreshed from the server.
   */
  it('persists an update that mutates the draft', () => {
    scheduleEntriesCollection.insert(baseEntry());

    scheduleEntriesCollection.update('entry-1', (draft) => {
      Object.assign(draft, baseEntry({ title: 'Umbenannt', location: null }));
    });

    const stored = scheduleEntriesCollection.get('entry-1');
    expect(stored?.title).toBe('Umbenannt');
    expect(stored?.location).toBeNull();
  });
});
