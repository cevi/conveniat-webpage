import { createCallerFactory, createTRPCContext } from '@/trpc/init';
import { makeQueryClient } from '@/trpc/query-client';
import { appRouter } from '@/trpc/routers/_app';
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { cache } from 'react';
import 'server-only';

export const getQueryClient = cache(makeQueryClient);
const caller = createCallerFactory(appRouter)(createTRPCContext);
export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  caller,
  getQueryClient,
);
