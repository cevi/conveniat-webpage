/**
 * @jest-environment jsdom
 */

import { queryAvailability } from '@/features/chat/utils/query-availability';
import { onlineManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';

/** A failure the way tRPC reports it, with the code in `data`. */
class TrpcLikeError extends Error {
  readonly data: { code: string };
  constructor(code: string) {
    super(code);
    this.data = { code };
  }
}

/** Runs a real query with `load` and reads its availability, with a cache seeded by `cached`. */
const renderAvailability = (
  load: () => Promise<string[]>,
  cached?: string[],
): { result: { current: ReturnType<typeof queryAvailability> }; client: QueryClient } => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cached !== undefined) client.setQueryData(['chats'], cached);
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => queryAvailability(useQuery({ queryKey: ['chats'], queryFn: load, staleTime: 0 })),
    { wrapper },
  );
  return { result, client };
};

const never = (): Promise<string[]> => new Promise(() => {});

describe('queryAvailability', () => {
  afterEach(() => {
    act(() => onlineManager.setOnline(true));
  });

  it('is loading while the first answer is on its way', () => {
    const { result } = renderAvailability(never);
    expect(result.current).toBe('loading');
  });

  it('is offline, not loading forever, when nothing is cached and there is no connection', () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderAvailability(never);
    expect(result.current).toBe('offline');
  });

  it('is an error, not an empty list, when the load fails with nothing cached', async () => {
    const { result } = renderAvailability(() => Promise.reject(new Error('500')));
    await waitFor(() => expect(result.current).toBe('error'));
  });

  it('stays an error while a retry is under way', async () => {
    let fail = true;
    const { result, client } = renderAvailability(() =>
      fail ? Promise.reject(new Error('500')) : never(),
    );
    await waitFor(() => expect(result.current).toBe('error'));
    fail = false;
    act(() => void client.refetchQueries({ queryKey: ['chats'] }));
    expect(result.current).toBe('error');
  });

  it('shows cached data offline and after a failed refresh', async () => {
    const { result } = renderAvailability(() => Promise.reject(new Error('500')), ['Cevi Uster']);
    await waitFor(() => expect(result.current).toBe('ready'));
    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe('ready');
  });

  it('knows a cached chat the server no longer shows the user', async () => {
    const { result } = renderAvailability(
      () => Promise.reject(new TrpcLikeError('NOT_FOUND')),
      ['Züri 11'],
    );
    await waitFor(() => expect(result.current).toBe('notMember'));
  });

  it('does not call a chat that never was cached one the user left', async () => {
    const { result } = renderAvailability(() => Promise.reject(new TrpcLikeError('NOT_FOUND')));
    await waitFor(() => expect(result.current).toBe('error'));
  });
});
