import { makeQueryClient } from '@/trpc/query-client';
import { QueryObserver } from '@tanstack/react-query';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** What one server render does with a query: read it, then let go of it once the page is sent. */
const renderOnce = async (gcTime?: number): Promise<void> => {
  const client = makeQueryClient();
  const observer = new QueryObserver(client, {
    queryKey: ['search', 'getSearchResultList'],
    queryFn: (): Promise<string[]> => Promise.resolve([]),
    ...(gcTime === undefined ? {} : { gcTime }),
  });
  const unsubscribe = observer.subscribe(() => {});
  await jest.advanceTimersByTimeAsync(0);
  unsubscribe();
};

describe('query client of a server render', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // A pending timer keeps the request it was started in alive until it fires (#1659).
  test('leaves no timer behind once the render is done', async () => {
    await renderOnce();

    expect(jest.getTimerCount()).toBe(0);
  });

  test('leaves no timer behind for a query that keeps its data for a week', async () => {
    await renderOnce(WEEK);

    expect(jest.getTimerCount()).toBe(0);
  });
});
