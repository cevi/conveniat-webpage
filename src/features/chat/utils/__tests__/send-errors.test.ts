import { isRetryableSendError, isTransportError } from '@/features/chat/utils/send-errors';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { initTRPC, TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';

// A real tRPC server, so errors cross the wire in the shape production sends them. It leaves
// out the superjson transformer of `src/trpc/init.ts`, which Jest cannot load and which only
// wraps the payload, not whether an error carries `data`.
type FetchEsque = NonNullable<Parameters<typeof httpBatchLink>[0]['fetch']>;

const t = initTRPC.create();
const router = t.router({
  sendMessage: t.procedure.input(z.object({ content: z.string().min(1) })).mutation(({ input }) => {
    if (input.content === 'unauthenticated') {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated.' });
    }
    if (input.content === 'crash') throw new Error('database gone');
    if (input.content === 'disabled') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Messaging is disabled in this chat or globally.',
      });
    }
    return 'stored';
  }),
});

const serveFromRouter: FetchEsque = async (input, init) =>
  await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(new URL(input as string, 'http://localhost'), init as RequestInit),
    router,
    createContext: () => ({}),
  });

/** The error the real client raises for one send over the given fetch. */
const failSend = async (fetchImpl: FetchEsque, content = 'hello'): Promise<unknown> => {
  const client = createTRPCClient<typeof router>({
    links: [httpBatchLink({ url: 'http://localhost/api/trpc', fetch: fetchImpl })],
  });
  try {
    await client.sendMessage.mutate({ content });
  } catch (error) {
    return error;
  }
  throw new Error('the send was expected to fail');
};

const rejectWith =
  (message: string): FetchEsque =>
  (): Promise<Response> =>
    Promise.reject(new TypeError(message));

const nginx502: FetchEsque = (): Promise<Response> =>
  Promise.resolve(
    new Response('<html><body><h1>502 Bad Gateway</h1><hr><center>nginx</center></body></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }),
  );

describe('isTransportError / isRetryableSendError', () => {
  it.each([
    ['Safari losing the connection', rejectWith('Load failed')],
    ['Chrome losing the connection', rejectWith('Failed to fetch')],
    [
      'Firefox losing the connection',
      rejectWith('NetworkError when attempting to fetch resource.'),
    ],
    ['nginx answering with an HTML 502 page', nginx502],
  ])('keeps a send queued after %s', async (_case, fetchImpl) => {
    const error = await failSend(fetchImpl);

    expect(isTransportError(error)).toBe(true);
    expect(isRetryableSendError(error)).toBe(true);
  });

  it('keeps a send queued while the session is expired', async () => {
    const error = await failSend(serveFromRouter, 'unauthenticated');

    expect(isTransportError(error)).toBe(false);
    expect(isRetryableSendError(error)).toBe(true);
  });

  it('keeps a send queued when the server crashes', async () => {
    const error = await failSend(serveFromRouter, 'crash');

    expect(isTransportError(error)).toBe(false);
    expect(isRetryableSendError(error)).toBe(true);
  });

  it('gives up on a send the input validation rejects', async () => {
    const error = await failSend(serveFromRouter, '');

    expect(isTransportError(error)).toBe(false);
    expect(isRetryableSendError(error)).toBe(false);
  });

  it('gives up on a send into a chat where messaging is disabled', async () => {
    const error = await failSend(serveFromRouter, 'disabled');

    expect(isTransportError(error)).toBe(false);
    expect(isRetryableSendError(error)).toBe(false);
  });

  it('gives up on an error that did not come from tRPC at all', () => {
    const error = new Error('Server returned empty message payload during offline sync');

    expect(isTransportError(error)).toBe(false);
    expect(isRetryableSendError(error)).toBe(false);
  });
});
