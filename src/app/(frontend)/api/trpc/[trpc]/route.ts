import { withEntityTag } from '@/trpc/conditional-response';
import { InvariantTRPCError } from '@/trpc/error-formatter';
import { createTRPCContext } from '@/trpc/init';
import { EXPECTED_ERROR_CODES } from '@/trpc/middleware/tracing';
import { appRouter } from '@/trpc/routers/_app';
import { createLogger } from '@/utils/server-logger';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const logger = createLogger('trpc');

const handleTrpcRequest = (request: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error, req, ctx }) => {
      if (error.code === 'UNAUTHORIZED') {
        const cookieHeader = req.headers.get('cookie');
        const hasAuthCookie =
          (cookieHeader?.includes('next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-next-auth.session-token') ?? false) ||
          (cookieHeader?.includes('authjs.session-token') ?? false) ||
          (cookieHeader?.includes('__Secure-authjs.session-token') ?? false);

        if (hasAuthCookie && error.message.includes('User not authenticated')) {
          logger.warn('session validation failed despite a valid cookie', {
            'trpc.path': path,
            'trpc.code': error.code,
          });
        }
        return;
      }

      // Our own client never makes this call, so it is a client bug or someone probing the API.
      // Rare by construction, and worth seeing without turning on debug.
      if (error instanceof InvariantTRPCError) {
        logger.warn('procedure refused a call our client never makes', {
          'trpc.path': path,
          'trpc.code': error.code,
          'user.id': ctx?.user?.uuid,
          error,
        });
        return;
      }

      // A rejected enrollment, a time conflict or an unknown id is the API working as designed,
      // and the client renders all of them. They are logged at `debug` rather than dropped, so
      // that `LOG_LEVEL=debug` can bring them back when a client reports a rejection nobody
      // can reproduce, without them counting towards the error rate the rest of the time.
      if (EXPECTED_ERROR_CODES.has(error.code)) {
        logger.debug('procedure rejected', {
          'trpc.path': path,
          'trpc.code': error.code,
          error,
        });
        return;
      }

      // A server fault used to fall out of this callback unlogged, which is why #1537 left no
      // trace at all: the procedure swallowed its own failure, and the one place that could still
      // have recorded it only ever spoke about 401s. The input is deliberately left out — it
      // carries chat message bodies on other paths. The logger flattens the `Error` and the OTel
      // destination attaches the trace id of the span the procedure ran in, so the failing line
      // in Loki links straight to the trace.
      logger.error('procedure failed', {
        'trpc.path': path,
        'trpc.code': error.code,
        error,
      });
    },
  });

const handler = async (request: Request): Promise<Response> =>
  withEntityTag(request, await handleTrpcRequest(request));

export { handler as GET, handler as POST };
