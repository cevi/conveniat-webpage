import { makeQueryClient } from '@/trpc/query-client';
import {
  deserializePersistedClient,
  serializePersistedClient,
  shouldPersistQuery,
} from '@/trpc/query-persistence';
import type { QueryClient } from '@tanstack/react-query';
import { dehydrate, onlineManager } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import superjson from 'superjson';

const CACHED_KEY = [['chat', 'chats'], { type: 'query' }];
const WAITING_KEY = [['chat', 'getChat'], { input: { chatId: 'never-opened' }, type: 'query' }];

const clients: QueryClient[] = [];
const newClient = (): QueryClient => {
  const client = makeQueryClient();
  clients.push(client);
  return client;
};

/** Restores a blob into a fresh client, the way the app does on its next launch. */
const restore = async (blob: string): Promise<{ client: QueryClient; removed: boolean }> => {
  const client = newClient();
  let removed = false;
  await persistQueryClientRestore({
    queryClient: client,
    persister: {
      persistClient: (): Promise<void> => Promise.resolve(),
      restoreClient: (): Promise<PersistedClient> =>
        Promise.resolve(deserializePersistedClient(blob)),
      removeClient: (): Promise<void> => {
        removed = true;
        return Promise.resolve();
      },
    },
  }).catch(() => {});
  return { client, removed };
};

/** A session that cached one query and then went offline while another one was waiting. */
const sessionWithAQueryWaitingOffline = async (): Promise<QueryClient> => {
  const client = newClient();
  client.setQueryData(CACHED_KEY, ['a cached chat']);
  onlineManager.setOnline(false);
  client.query({ queryKey: WAITING_KEY, queryFn: () => Promise.resolve('late') }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  return client;
};

describe('persisted query cache', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    for (const client of clients.splice(0)) client.clear();
  });

  it('keeps the cached data after the app was closed with a query waiting offline', async () => {
    const previousSession = await sessionWithAQueryWaitingOffline();
    expect(previousSession.getQueryState(WAITING_KEY)?.fetchStatus).toBe('paused');

    const blob = serializePersistedClient({
      timestamp: Date.now(),
      buster: '',
      clientState: dehydrate(previousSession, { shouldDehydrateQuery: shouldPersistQuery }),
    });
    onlineManager.setOnline(true);

    const { client, removed } = await restore(blob);

    expect(removed).toBe(false);
    expect(client.getQueryData(CACHED_KEY)).toEqual(['a cached chat']);
  });

  it('keeps the cached data from a blob saved before waiting queries were left out', async () => {
    const previousSession = await sessionWithAQueryWaitingOffline();
    // what the persister used to write: every query, including the paused one and its promise
    const blob = superjson.stringify({
      timestamp: Date.now(),
      buster: '',
      clientState: dehydrate(previousSession, { shouldDehydrateQuery: () => true }),
    });
    onlineManager.setOnline(true);

    const { client, removed } = await restore(blob);

    expect(removed).toBe(false);
    expect(client.getQueryData(CACHED_KEY)).toEqual(['a cached chat']);
  });
});
