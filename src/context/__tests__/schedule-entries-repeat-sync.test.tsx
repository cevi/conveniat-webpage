/**
 * @jest-environment jsdom
 */

import { ScheduleEntriesProvider, useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { scheduleEntriesCollection } from '@/lib/tanstack-db';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const makeEntries = (title = 'Tagesstart'): CampScheduleEntryFrontendType[] =>
  ['quartier-kitsune', 'hof-cevi-uster', 'hof-zueri-11'].map((id) => ({
    id,
    title: `${title} ${id}`,
    description: { root: { type: 'root', children: [{ text: 'Treffpunkt beim Hof' }] } },
    timeslot: { date: '2027-07-26T00:00:00.000Z', time: '07:00 - 07:30' },
  })) as unknown as CampScheduleEntryFrontendType[];

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <ScheduleEntriesProvider>{children}</ScheduleEntriesProvider>
);

/** Lets the collection settle the writes of the sync. */
const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

// The mocked suite in schedule-entries-sync.test.tsx hands the sync plain objects. Rows of the
// real collection carry TanStack DB's virtual props, which made every entry look changed.
describe('schedule sync against the real collection', () => {
  beforeEach(async () => {
    await scheduleEntriesCollection.preload();
    const ids = [...scheduleEntriesCollection.state.keys()];
    if (ids.length > 0) scheduleEntriesCollection.delete(ids);
    await settle();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes nothing when the server sends the same entries again', async () => {
    const { result } = renderHook(() => useScheduleEntries(), { wrapper });
    act(() => result.current.syncFromServer(makeEntries()));
    await settle();
    expect(scheduleEntriesCollection.state.size).toBe(3);

    const insert = jest.spyOn(scheduleEntriesCollection, 'insert');
    const update = jest.spyOn(scheduleEntriesCollection, 'update');
    act(() => result.current.syncFromServer(makeEntries()));
    await settle();

    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('still writes an entry whose content changed', async () => {
    const { result } = renderHook(() => useScheduleEntries(), { wrapper });
    act(() => result.current.syncFromServer(makeEntries()));
    await settle();

    const update = jest.spyOn(scheduleEntriesCollection, 'update');
    act(() => result.current.syncFromServer(makeEntries('Tagesschluss')));
    await settle();

    expect(update).toHaveBeenCalledTimes(1);
    expect(scheduleEntriesCollection.get('hof-zueri-11')?.title).toBe('Tagesschluss hof-zueri-11');
  });
});
