/**
 * @jest-environment jsdom
 */

import { makeQueryClient } from '@/trpc/query-client';
import { QueryObserver } from '@tanstack/react-query';

const HOUR = 60 * 60 * 1000;
const KEY = ['search', 'getSearchResultList'];

describe('query client in the browser', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // the persisted cache can only restore what is still in memory when it is written
  test('keeps a query nobody reads for 72 hours, then drops it', async () => {
    const client = makeQueryClient();
    const unsubscribe = new QueryObserver(client, {
      queryKey: KEY,
      queryFn: (): Promise<string[]> => Promise.resolve([]),
    }).subscribe(() => {});
    await jest.advanceTimersByTimeAsync(0);
    unsubscribe();

    await jest.advanceTimersByTimeAsync(71 * HOUR);
    expect(client.getQueryData(KEY)).toEqual([]);

    await jest.advanceTimersByTimeAsync(1 * HOUR);
    expect(client.getQueryData(KEY)).toBeUndefined();
  });
});
