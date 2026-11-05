/**
 * @jest-environment jsdom
 */

import { toStoredScheduleEntry } from '@/lib/stored-schedule-entry';
import { scheduleEntriesCollection } from '@/lib/tanstack-db';

const STORAGE_KEY = 'tanstack-db-schedule-entries';

const EMPTY_DESCRIPTION = { root: { children: [] } };

const entry = (id: string, description: unknown = EMPTY_DESCRIPTION): object => ({
  id,
  title: `Block ${id}`,
  timeslot: { date: '2027-07-24', time: '14:00 - 16:00' },
  description,
});

/** Lets the collection settle the write, which is when it refuses a row it cannot store. */
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 20));
};

describe('schedule entries in localStorage', () => {
  beforeEach(async () => {
    await scheduleEntriesCollection.preload();
    const ids = [...scheduleEntriesCollection.state.keys()];
    if (ids.length > 0) scheduleEntriesCollection.delete(ids);
    await settle();
  });

  // tRPC carries `undefined` inside an array, which JSON cannot hold. TanStack DB refuses such a
  // row only when the write settles, and rolls back every row of the batch with it, without a
  // throw that the per-entry fallback could catch: one entry emptied the offline Programm.
  it('keeps a whole batch in which one entry holds a value JSON has no form for', async () => {
    const lexical = { root: { children: [{ text: 'Treffpunkt bei Cevi Uster' }, undefined] } };

    scheduleEntriesCollection.insert(
      [entry('a'), entry('b', lexical), entry('c')].map((item) => toStoredScheduleEntry(item, 1)),
    );
    await settle();

    expect([...scheduleEntriesCollection.state.keys()].sort()).toEqual(['a', 'b', 'c']);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as object;
    expect(Object.keys(stored)).toHaveLength(3);
    expect(scheduleEntriesCollection.get('b')?.description).toEqual({
      root: { children: [{ text: 'Treffpunkt bei Cevi Uster' }, null] },
    });
  });
});
