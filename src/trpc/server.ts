import { createCallerFactory, createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import 'server-only';

/**
 * Calls a procedure from a server component, with the context of the current request.
 *
 * Detached from any query client: the answer is not cached, and nothing is handed to the
 * browser. A screen that should start with the data would prefetch through
 * `createTRPCOptionsProxy` instead, see https://trpc.io/docs/client/tanstack-react-query/server-components.
 */
export const caller = createCallerFactory(appRouter)(createTRPCContext);
