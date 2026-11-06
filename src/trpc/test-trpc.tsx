import type { TrpcQueries } from '@/trpc/client';
import type { ErrorShape } from '@/trpc/error-formatter';
import { makeQueryClient } from '@/trpc/query-client';
import type { AppRouter } from '@/trpc/routers/_app';
import { QueryClientProvider } from '@tanstack/react-query';
import type { OperationLink, TRPCClient, TRPCLink } from '@trpc/client';
import { createTRPCClient, TRPCClientError } from '@trpc/client';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';
import { observable } from '@trpc/server/observable';
import { TRPC_ERROR_CODES_BY_KEY } from '@trpc/server/rpc';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type React from 'react';

/** Answers one procedure in a test. Throw to fail the call, see {@link testTrpcError}. */
export type ProcedureHandler = (input: unknown) => unknown;

export interface TestTrpc extends TrpcQueries {
  trpcClient: TRPCClient<AppRouter>;
  /** every call that reached the "server", in order */
  calls: { path: string; input: unknown }[];
  /** the paths called without a handler; any of them fails the test after it ran */
  unhandledPaths: string[];
  /** the providers a hook or component needs, for `render` and `renderHook` */
  wrapper: React.FC<{ children: React.ReactNode }>;
}

let current: TestTrpc | undefined;

const currentTestTrpc = (): TestTrpc => {
  if (current === undefined) throw new Error('createTestTrpc() has not been called in this test');
  return current;
};

/** The link that answers every call from `handlers` and logs it in `calls`. */
const answerFrom = (
  handlers: Record<string, ProcedureHandler>,
  { calls, unhandledPaths }: Pick<TestTrpc, 'calls' | 'unhandledPaths'>,
): TRPCLink<AppRouter> => {
  const answer: OperationLink<AppRouter> = ({ op }) =>
    observable((observer) => {
      calls.push({ path: op.path, input: op.input });
      const handler = handlers[op.path];
      Promise.resolve()
        .then(() => {
          if (handler === undefined) {
            // React Query keeps this as an ordinary failed request, which a test checking
            // something else would never notice: the afterEach below fails the test instead
            unhandledPaths.push(op.path);
            throw new Error(`No test handler for ${op.path}`);
          }
          return handler(op.input);
        })
        .then(
          (data: unknown) => {
            observer.next({ result: { type: 'data', data } });
            observer.complete();
          },
          (error: unknown) => {
            observer.error(TRPCClientError.from(error as Error));
          },
        );
    });
  return () => answer;
};

/**
 * A tRPC client for tests that never leaves the process: each call goes to the handler of its
 * path, like `'chat.archiveChat'`, and a call without a handler fails the test. Queries and
 * mutations go through the app's own query client and the same keys as in the browser, so a
 * test reads the cache with `queryClient.getQueryData(trpc.x.y.queryKey(input))`.
 *
 * Mock `@/trpc/client` with {@link mockTrpcClientModule} to hand it to the code under test.
 *
 * @param handlers the answer of each procedure the test expects to be called
 */
export const createTestTrpc = (handlers: Record<string, ProcedureHandler> = {}): TestTrpc => {
  const calls: TestTrpc['calls'] = [];
  const unhandledPaths: TestTrpc['unhandledPaths'] = [];
  const link = answerFrom(handlers, { calls, unhandledPaths });

  const trpcClient = createTRPCClient<AppRouter>({ links: [link] });
  const queryClient = makeQueryClient();
  // a failing call in a test should fail at once, not after three retries
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    mutations: { ...queryClient.getDefaultOptions().mutations, retry: false },
  });
  const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });

  const wrapper: TestTrpc['wrapper'] = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  current = { trpc, queryClient, trpcClient, calls, unhandledPaths, wrapper };
  return current;
};

// Registered once per test file that imports this module, which only tests do.
afterEach(() => {
  const unhandled = current?.unhandledPaths ?? [];
  current = undefined;
  if (unhandled.length > 0) {
    throw new Error(
      `The code under test called procedures without a test handler: ${[...new Set(unhandled)].join(', ')}`,
    );
  }
});

/**
 * The error a procedure refuses with, carrying the code and the reason a router throws through
 * `createErrorThrower`, for a handler to throw.
 *
 * @param code the tRPC error code, like `'NOT_FOUND'`
 * @param data more of the error's `data`, like `{ reason: 'chatFull' }`
 */
export const testTrpcError = (
  code: TRPC_ERROR_CODE_KEY,
  data: Partial<ErrorShape['data']> = {},
): TRPCClientError<AppRouter> =>
  new TRPCClientError(code, {
    result: {
      error: {
        code: TRPC_ERROR_CODES_BY_KEY[code],
        message: code,
        data: { code, httpStatus: getHTTPStatusCodeFromError(new TRPCError({ code })), ...data },
      },
    },
  });

/**
 * What `jest.mock('@/trpc/client', …)` returns so the code under test reads the client of the
 * latest {@link createTestTrpc}:
 *
 * ```ts
 * jest.mock('@/trpc/client', () =>
 *   jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
 * );
 * ```
 */
export const mockTrpcClientModule = {
  useTRPC: (): TestTrpc['trpc'] => currentTestTrpc().trpc,
  useTRPCClient: (): TestTrpc['trpcClient'] => currentTestTrpc().trpcClient,
  useOptionalTrpcQueries: (): TrpcQueries | undefined =>
    current === undefined ? undefined : { trpc: current.trpc, queryClient: current.queryClient },
};
