/**
 * What a chat screen can show for one of its queries:
 * - `loading` while the first answer is on its way, or before the query may run,
 * - `offline` when nothing is cached and the query waits for a connection,
 * - `error` when nothing is cached and the query failed, also while it tries again,
 * - `notMember` when the server no longer lets the user see a chat the phone has cached,
 * - `ready` when there is data to show.
 */
export type QueryAvailability = 'loading' | 'offline' | 'error' | 'notMember' | 'ready';

/** The parts of a TanStack query result the decision needs. */
export interface QueryAvailabilityInput {
  data: unknown;
  isLoading: boolean;
  isPaused: boolean;
  isPending: boolean;
  isError: boolean;
  errorUpdateCount: number;
  error: { data?: { code?: string } | null | undefined } | null;
}

/**
 * Decides by whether there is data first and by the query's status second, so cached data
 * always shows, and a list is only called empty after an answer that said so.
 *
 * Offline is not an error: TanStack pauses a query without a connection instead of failing it,
 * so `isError` never turns true and resumes on its own once the connection is back.
 */
export const queryAvailability = (query: QueryAvailabilityInput): QueryAvailability => {
  const hasData = query.data !== undefined;

  // Cached data means the user could read the chat before; NOT_FOUND now means they left or
  // were removed. Without a cache it may just as well be a chat that never existed.
  if (query.error?.data?.code === 'NOT_FOUND' && hasData) return 'notMember';
  if (hasData) return 'ready';

  if (query.isPaused && query.isPending) return 'offline';
  // a refetch after a failure is loading again; it stays an error until it succeeds
  if (query.isError || (query.isLoading && query.errorUpdateCount !== 0)) return 'error';
  return 'loading';
};
