import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const handler = (request: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };

// this is an API route, so it should not be cached at Next.js level
export const dynamic = 'force-dynamic';
