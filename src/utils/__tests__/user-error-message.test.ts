import { createErrorThrower, formatTRPCError } from '@/trpc/error-formatter';
import { userErrorMessage } from '@/utils/user-error-message';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { initTRPC, TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';

// A real tRPC server with the app's error formatter, so errors cross the wire in the shape
// production sends them. It leaves out the superjson transformer, which Jest cannot load.
type FetchEsque = NonNullable<Parameters<typeof httpBatchLink>[0]['fetch']>;

const texts = {
  workshopFull: {
    de: '«{title}» ist bereits ausgebucht.',
    en: '“{title}” is already fully booked.',
    fr: '« {title} » est déjà complet.',
  },
};
const fallback = {
  de: 'Das hat nicht geklappt.',
  en: 'That did not work.',
  fr: 'Cela n’a pas fonctionné.',
};
const refuse = createErrorThrower(texts);

const t = initTRPC.create({ errorFormatter: formatTRPCError });
const router = t.router({
  enrol: t.procedure.input(z.object({ courseId: z.string().min(1) })).mutation(({ input }) => {
    if (input.courseId === 'full') {
      throw refuse('BAD_REQUEST', 'workshopFull', { title: 'Feuer machen' });
    }
    if (input.courseId === 'closed') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Chat creation is currently disabled.' });
    }
    if (input.courseId === 'crash') throw new Error('connect ECONNREFUSED 10.0.0.4:5432');
    return 'enrolled';
  }),
});

const server: FetchEsque = async (input, init) =>
  await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(new URL(input as string, 'http://localhost'), init as RequestInit),
    router,
    createContext: () => ({}),
  });

const offline: FetchEsque = (): Promise<Response> =>
  Promise.reject(new TypeError('Failed to fetch'));

/** The error the real client raises for one enrolment over the given fetch. */
const failEnrol = async (fetchImpl: FetchEsque, courseId: string): Promise<unknown> => {
  const client = createTRPCClient<typeof router>({
    links: [httpBatchLink({ url: 'http://localhost/api/trpc', fetch: fetchImpl })],
  });
  try {
    await client.enrol.mutate({ courseId });
  } catch (error) {
    return error;
  }
  throw new Error('the enrolment was expected to fail');
};

describe('userErrorMessage', () => {
  it('translates a refusal into the language of the page, with its params', async () => {
    const error = await failEnrol(server, 'full');

    expect(userErrorMessage(error, 'fr', texts, fallback)).toBe(
      '« Feuer machen » est déjà complet.',
    );
    expect(userErrorMessage(error, 'de', texts, fallback)).toBe(
      '«Feuer machen» ist bereits ausgebucht.',
    );
  });

  it('logs the refusal in English', async () => {
    const error = await failEnrol(server, 'full');

    expect((error as Error).message).toBe('“Feuer machen” is already fully booked.');
  });

  it('says there is no connection instead of the browser’s English', async () => {
    expect(userErrorMessage(await failEnrol(offline, 'any'), 'de', texts, fallback)).toBe(
      'Keine Verbindung. Versuche es erneut, sobald du wieder Empfang hast.',
    );
  });

  it('falls back for a refusal that names no reason', async () => {
    expect(userErrorMessage(await failEnrol(server, 'closed'), 'en', texts, fallback)).toBe(
      'That did not work.',
    );
  });

  it('falls back for a reason the texts do not know', async () => {
    expect(userErrorMessage(await failEnrol(server, 'full'), 'en', {}, fallback)).toBe(
      'That did not work.',
    );
  });

  it('does not take a reason named like an object property for a text', async () => {
    const error = await failEnrol(server, 'full');
    (error as { data: { reason: string } }).data.reason = 'constructor';

    expect(userErrorMessage(error, 'de', texts, fallback)).toBe('Das hat nicht geklappt.');
  });

  it('hides what a crash says about the server', async () => {
    expect(userErrorMessage(await failEnrol(server, 'crash'), 'de', texts, fallback)).toBe(
      'Das hat nicht geklappt.',
    );
  });

  it('says an input that failed its schema is invalid, instead of zod’s issue list', async () => {
    expect(userErrorMessage(await failEnrol(server, ''), 'fr', texts, fallback)).toBe(
      'Les données sont invalides. Recharge la page et réessaie.',
    );
  });

  it('falls back for an error that did not come from tRPC', () => {
    expect(userErrorMessage(new SyntaxError('Unexpected token <'), 'en')).toBe(
      'Something went wrong',
    );
  });
});
