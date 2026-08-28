import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

/** Codes the client is expected to receive and render, rather than symptoms of a broken server. */
const EXPECTED_ERROR_CODES = new Set([
  'BAD_REQUEST',
  'CONFLICT',
  'FORBIDDEN',
  'NOT_FOUND',
  'PRECONDITION_FAILED',
  'TOO_MANY_REQUESTS',
  'UNPROCESSABLE_CONTENT',
]);

const handler = (request: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error, req }) => {
      if (error.code === 'UNAUTHORIZED') {
        const cookieHeader = req.headers.get('cookie');
        const hasAuthCookie =
          (cookieHeader?.includes('next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('authjs.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-authjs.session-token') ?? false);

        if (hasAuthCookie && error.message.includes('User not authenticated')) {
          console.warn(
            `[TRPC] 401 Unauthorized for path ${path}. Valid cookie present but session validation failed. (User: undefined)`,
          );
        }
        return;
      }

      // A rejected enrollment, a time conflict or an unknown id is the API working as designed,
      // and the client renders all of them. Those stay quiet.
      if (EXPECTED_ERROR_CODES.has(error.code)) {
        return;
      }

      // A server fault used to fall out of this callback unlogged, which is why #1537 left no
      // trace at all: the procedure swallowed its own failure, and the one place that could still
      // have recorded it only ever spoke about 401s. The input is deliberately left out — it
      // carries chat message bodies on other paths.
      console.error(
        `[TRPC] ${error.code} on path ${path ?? 'unknown'}: ${error.message}`,
        error.cause,
      );
    },
  });

export { handler as GET, handler as POST };
