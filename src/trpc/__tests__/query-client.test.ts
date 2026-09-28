import { makeQueryClient } from '@/trpc/query-client';
import type { QueryClient, QueryObserverResult } from '@tanstack/react-query';
import { dehydrate, onlineManager, QueryObserver } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';

const KEY = ['map', 'getMapAnnotations'];
const MINUTE = 60 * 1000;

/**
 * Builds a client the way the app gets one after a restart: a fresh client restored from the
 * IndexedDB blob, which keeps the time each query was originally fetched.
 */
const restoreClientWithDataFrom = async (updatedAt: number): Promise<QueryClient> => {
  const previousSession = makeQueryClient();
  previousSession.setQueryData(KEY, 'cached', { updatedAt });
  const blob = { timestamp: Date.now(), buster: '', clientState: dehydrate(previousSession) };

  const client = makeQueryClient();
  await persistQueryClientRestore({
    queryClient: client,
    persister: {
      persistClient: (): Promise<void> => Promise.resolve(),
      restoreClient: (): Promise<typeof blob> => Promise.resolve(blob),
      removeClient: (): Promise<void> => Promise.resolve(),
    },
  });
  // what QueryClientProvider does: listen for the connection and the window coming back
  client.mount();
  return client;
};

/** Mounts a screen reading the query, like a component calling useQuery. */
const mount = (
  client: QueryClient,
  fetchFromServer: () => Promise<string>,
): { observer: QueryObserver<string>; unmount: () => void } => {
  const observer = new QueryObserver<string>(client, { queryKey: KEY, queryFn: fetchFromServer });
  const unmount = observer.subscribe(() => {});
  return { observer, unmount };
};

const waitFor = (
  observer: QueryObserver<string>,
  predicate: (result: QueryObserverResult<string>) => boolean,
): Promise<QueryObserverResult<string>> =>
  new Promise((resolve) => {
    if (predicate(observer.getCurrentResult())) {
      resolve(observer.getCurrentResult());
      return;
    }
    const unsubscribe = observer.subscribe((result) => {
      if (!predicate(result)) return;
      unsubscribe();
      resolve(result);
    });
  });

describe('persisted query cache on a restarted app', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  test('shows the restored data at once and replaces it once the server answers', async () => {
    const client = await restoreClientWithDataFrom(Date.now() - 3 * 60 * MINUTE);
    const server = jest.fn().mockResolvedValue('fresh');

    const { observer, unmount } = mount(client, server);

    expect(observer.getCurrentResult().data).toBe('cached');
    const result = await waitFor(observer, (r) => r.data === 'fresh');
    expect(result.data).toBe('fresh');
    expect(server).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('does not ask the server again for data younger than five minutes', async () => {
    const client = await restoreClientWithDataFrom(Date.now() - 1 * MINUTE);
    const server = jest.fn().mockResolvedValue('fresh');

    const { observer, unmount } = mount(client, server);
    await Promise.resolve();

    expect(server).not.toHaveBeenCalled();
    expect(observer.getCurrentResult().data).toBe('cached');
    unmount();
  });

  test('offline, keeps showing the restored data and fetches once the connection is back', async () => {
    const client = await restoreClientWithDataFrom(Date.now() - 3 * 60 * MINUTE);
    const server = jest.fn().mockResolvedValue('fresh');
    onlineManager.setOnline(false);

    const { observer, unmount } = mount(client, server);
    await Promise.resolve();

    expect(server).not.toHaveBeenCalled();
    expect(observer.getCurrentResult()).toMatchObject({
      data: 'cached',
      status: 'success',
      fetchStatus: 'paused',
    });

    onlineManager.setOnline(true);
    const result = await waitFor(observer, (r) => r.data === 'fresh');
    expect(result.data).toBe('fresh');
    unmount();
  });

  test('on a connection that fails every request, still shows the restored data', async () => {
    const client = await restoreClientWithDataFrom(Date.now() - 3 * 60 * MINUTE);
    const server = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    // TanStack skips its retries outside a browser, so this fails on the first attempt
    const { observer, unmount } = mount(client, server);
    const result = await waitFor(observer, (r) => r.fetchStatus === 'idle' && r.status === 'error');

    expect(server).toHaveBeenCalled();
    expect(result).toMatchObject({
      data: 'cached',
      status: 'error',
      fetchStatus: 'idle',
    });
    unmount();
  });

  test('never asks the server again for the signed-in user', async () => {
    const client = makeQueryClient();
    const key = [['chat', 'user'], { input: {}, type: 'query' }];
    client.setQueryData(key, 'user-uuid', { updatedAt: Date.now() - 3 * 60 * MINUTE });
    const server = jest.fn().mockResolvedValue('user-uuid');

    const unmount = new QueryObserver(client, { queryKey: key, queryFn: server }).subscribe(
      () => {},
    );
    await Promise.resolve();

    expect(server).not.toHaveBeenCalled();
    unmount();
  });
});
