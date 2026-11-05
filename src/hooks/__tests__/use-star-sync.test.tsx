/**
 * @jest-environment jsdom
 */

import { useStarSync } from '@/hooks/use-star-sync';
import { isStarredRow } from '@/lib/star-sync';
import { setLocalStar, starsCollection, type StarRecord } from '@/lib/tanstack-db';
import { act, renderHook } from '@testing-library/react';

let online = true;
const database = new Set<string>();
const updateStars = jest.fn(
  ({ changes }: { changes: { courseId: string; starred: boolean }[] }): Promise<string[]> => {
    for (const { courseId, starred } of changes) {
      if (starred) database.add(courseId);
      else database.delete(courseId);
    }
    return Promise.resolve([...database]);
  },
);

jest.mock('@/hooks/use-auth-status', () => ({ useAuthStatus: (): string => 'authenticated' }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => online }));
jest.mock('@/trpc/client', () => ({
  trpc: {
    schedule: {
      star: { updateStars: { useMutation: (): unknown => ({ mutateAsync: updateStars }) } },
    },
  },
}));

const rows = (): StarRecord[] => [...starsCollection.state.values()];
const shownStars = (): string[] =>
  rows()
    .filter((row) => isStarredRow(row))
    .map((row) => row.id);

/** Lets the debounce run out and the request and its answer settle. */
const settle = async (): Promise<void> => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000);
  });
};

describe('useStarSync', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    online = true;
    database.clear();
    updateStars.mockClear();
    await starsCollection.preload();
    for (const id of starsCollection.state.keys()) starsCollection.delete(id);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('brings back the stars of the database after the local data was cleared', async () => {
    database.add('seilbruecke');

    renderHook(() => useStarSync(rows()));
    await settle();

    expect(shownStars()).toEqual(['seilbruecke']);
  });

  it('tells the database about a star removed offline once the device is back online', async () => {
    database.add('seilbruecke');
    const { rerender } = renderHook(() => useStarSync(rows()));
    await settle();

    online = false;
    rerender();
    act(() => setLocalStar('seilbruecke', false));
    rerender();
    await settle();
    expect(updateStars).toHaveBeenCalledTimes(1);

    online = true;
    rerender();
    await settle();

    expect(database.has('seilbruecke')).toBe(false);
    expect(shownStars()).toEqual([]);
  });

  it('keeps every change when the sync fails', async () => {
    const { rerender } = renderHook(() => useStarSync(rows()));
    await settle();
    updateStars.mockRejectedValueOnce(new Error('Failed to fetch'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    act(() => setLocalStar('theater', true));
    rerender();
    await settle();

    expect(shownStars()).toEqual(['theater']);
    expect(rows()[0]?.synced).toBe(false);
    warn.mockRestore();
  });
});
