/**
 * @jest-environment jsdom
 */

import { ScheduleEntriesProvider, useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const collectionState = new Map<string, Record<string, unknown>>();
const insertMock = jest.fn();
const updateMock = jest.fn();
const deleteMock = jest.fn();

jest.mock('@/lib/tanstack-db', () => ({
  scheduleEntriesCollection: {
    get state(): Map<string, Record<string, unknown>> {
      return collectionState;
    },
    insert: (...arguments_: unknown[]): unknown => insertMock(...arguments_),
    update: (...arguments_: unknown[]): unknown => updateMock(...arguments_),
    delete: (...arguments_: unknown[]): unknown => deleteMock(...arguments_),
  },
}));

jest.mock('@tanstack/react-db', () => ({
  useLiveQuery: (): { data: unknown[] } => ({ data: [] }),
}));

const makeEntries = (count: number): CampScheduleEntryFrontendType[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    title: `Entry ${index}`,
    timeslot: { date: '2027-07-26T00:00:00.000Z', time: '10:00 - 11:00' },
  })) as unknown as CampScheduleEntryFrontendType[];

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <ScheduleEntriesProvider>{children}</ScheduleEntriesProvider>
);

describe('schedule offline sync batching', () => {
  beforeEach(() => {
    collectionState.clear();
    insertMock.mockClear();
    updateMock.mockClear();
    deleteMock.mockClear();
  });

  it('inserts every new entry in a single batched write', () => {
    const { result } = renderHook(() => useScheduleEntries(), { wrapper });

    act(() => {
      result.current.syncFromServer(makeEntries(300));
    });

    // The localStorage-backed collection rewrites the whole collection per mutation, so this
    // must be one call carrying 300 records - not 300 calls.
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertCalls = insertMock.mock.calls as unknown as unknown[][];
    expect(insertCalls[0]?.[0]).toHaveLength(300);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('writes nothing at all when the server returns unchanged entries', () => {
    for (const entry of makeEntries(300)) {
      // _syncedAt differs from what the next sync will stamp; it must not count as a change.
      collectionState.set(entry.id, { ...entry, _syncedAt: 1 });
    }

    const { result } = renderHook(() => useScheduleEntries(), { wrapper });

    act(() => {
      result.current.syncFromServer(makeEntries(300));
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('batches updates for entries whose content actually changed', () => {
    for (const entry of makeEntries(300)) {
      collectionState.set(entry.id, { ...entry, _syncedAt: 1 });
    }

    const changed = makeEntries(300);
    changed[0] = { ...changed[0], title: 'Renamed' } as CampScheduleEntryFrontendType;
    changed[1] = { ...changed[1], title: 'Also renamed' } as CampScheduleEntryFrontendType;

    const { result } = renderHook(() => useScheduleEntries(), { wrapper });

    act(() => {
      result.current.syncFromServer(changed);
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateCalls = updateMock.mock.calls as unknown as unknown[][];
    expect(updateCalls[0]?.[0]).toEqual(['entry-0', 'entry-1']);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
