import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const handler = (request: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error, req }) => {
      if (error.code === 'FORBIDDEN') {
        const cookieHeader = req.headers.get('cookie');
        const hasAuthCookie =
          (cookieHeader?.includes('next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('authjs.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-authjs.session-token') ?? false);

        if (hasAuthCookie && error.message.includes('User not authenticated')) {
          console.warn(
            `[TRPC] 403 Forbidden for path ${path}. Valid cookie present but session validation failed. (User: undefined)`,
          );
          return;
        }
      }
    },
  });

export { handler as GET, handler as POST };
