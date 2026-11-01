/**
 * @jest-environment jsdom
 */

// TanStack only polls in a browser, so this runs in jsdom, apart from the other query client tests
import { makeQueryClient } from '@/trpc/query-client';
import { QueryObserver } from '@tanstack/react-query';

const MINUTE = 60 * 1000;

describe('programme and camp map on an open screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    [[['schedule', 'getScheduleEntries'], { type: 'query' }]],
    [[['schedule', 'getById'], { input: { id: 'entry' }, type: 'query' }]],
    [[['map', 'getMapAnnotations'], { input: { locale: 'de' }, type: 'query' }]],
  ])('asks for edits at least once within five minutes: %j', async (key) => {
    const client = makeQueryClient();
    client.mount();
    client.setQueryData(key, 'loaded', { updatedAt: Date.now() });
    const server = jest.fn().mockResolvedValue('edited');

    const unmount = new QueryObserver(client, { queryKey: key, queryFn: server }).subscribe(
      () => {},
    );
    expect(server).not.toHaveBeenCalled();

    // an edit reaches the screen once a request finds the server's copy refreshed, which the
    // request before it may only have started; two requests within five minutes cover that
    await jest.advanceTimersByTimeAsync(5 * MINUTE);

    expect(server.mock.calls.length).toBeGreaterThanOrEqual(2);
    unmount();
    client.unmount();
  });
});
