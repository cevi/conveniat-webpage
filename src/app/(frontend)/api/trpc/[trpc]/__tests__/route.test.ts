import { formatTRPCError, INVARIANT_CODES, invariantError } from '@/trpc/error-formatter';
import { EXPECTED_ERROR_CODES } from '@/trpc/middleware/tracing';
import { type AnyRouter, initTRPC, TRPCError } from '@trpc/server';

const mockLog = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.mock('@/utils/server-logger', () => ({ createLogger: (): typeof mockLog => mockLog }));
jest.mock('@/trpc/init', () => ({
  createTRPCContext: (): object => ({ user: { uuid: 'anna' } }),
}));
jest.mock('@/trpc/conditional-response', () => ({
  withEntityTag: (_request: Request, response: Response): Response => response,
}));

const t = initTRPC.create({ errorFormatter: formatTRPCError });
const mockRouter: AnyRouter = t.router({
  forged: t.procedure.mutation(() => {
    throw invariantError(
      'BAD_REQUEST',
      'An image message must name an image uploaded to this chat.',
    );
  }),
  missing: t.procedure.mutation(() => {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found.' });
  }),
  crash: t.procedure.mutation(() => {
    throw new Error('connect ECONNREFUSED 10.0.0.4:5432');
  }),
});
jest.mock('@/trpc/routers/_app', () => ({
  get appRouter(): AnyRouter {
    return mockRouter;
  },
}));

const call = async (path: string): Promise<void> => {
  const { POST } = await import('@/app/(frontend)/api/trpc/[trpc]/route');
  const response = await POST(
    new Request(`http://localhost/api/trpc/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  // the procedure ran and refused, rather than the request failing before it
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(mockLog.error).not.toHaveBeenCalledWith(
    'procedure failed',
    expect.objectContaining({ 'trpc.code': 'UNSUPPORTED_MEDIA_TYPE' }),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the level a failed procedure is logged at', () => {
  it('is warn for a call our own client never makes', async () => {
    await call('forged');

    expect(mockLog.warn).toHaveBeenCalledWith(
      'procedure refused a call our client never makes',
      expect.objectContaining({
        'trpc.path': 'forged',
        'trpc.code': 'BAD_REQUEST',
        'user.id': 'anna',
      }),
    );
    expect(mockLog.debug).not.toHaveBeenCalled();
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('stays debug for any other refusal', async () => {
    await call('missing');

    expect(mockLog.debug).toHaveBeenCalledWith(
      'procedure rejected',
      expect.objectContaining({ 'trpc.path': 'missing', 'trpc.code': 'NOT_FOUND' }),
    );
    expect(mockLog.warn).not.toHaveBeenCalled();
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('stays error for a server fault', async () => {
    await call('crash');

    expect(mockLog.error).toHaveBeenCalledWith(
      'procedure failed',
      expect.objectContaining({ 'trpc.path': 'crash', 'trpc.code': 'INTERNAL_SERVER_ERROR' }),
    );
    expect(mockLog.warn).not.toHaveBeenCalled();
  });
});

describe('the codes an invariant refusal may use', () => {
  it.each(INVARIANT_CODES)('keeps %s out of the error rate', (code) => {
    expect(EXPECTED_ERROR_CODES.has(code)).toBe(true);
  });
});
