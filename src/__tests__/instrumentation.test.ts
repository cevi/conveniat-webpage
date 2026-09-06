import { onRequestError } from '@/instrumentation';

const capturedCalls: unknown[][] = [];
const captureException = jest.fn((...parameters: unknown[]): void => {
  capturedCalls.push(parameters);
});
const flush = jest.fn().mockResolvedValue(void 0);

jest.mock('@/build', () => ({
  __esModule: true,
  default: { version: '0.0.0', git: { hash: 'hash', branch: 'branch' } },
}));

jest.mock('@/lib/http-client', () => ({ initHttpClient: jest.fn() }));

jest.mock('@/tracing', () => ({
  sdk: { start: jest.fn() },
  hostMetrics: { start: jest.fn() },
}));

jest.mock('@/utils/otel-console-bridge', () => ({ installConsoleOtelBridge: jest.fn() }));

jest.mock('@/lib/posthog-server', () => ({
  getPostHogServer: (): unknown => ({ captureException, flush }),
}));

// `onRequestError` only reports on the Node.js runtime.
// eslint-disable-next-line n/no-process-env
process.env['NEXT_RUNTIME'] = 'nodejs';

const emptyRequest = { headers: {} };

/**
 * The shape Next.js throws for a bail-out or a control-flow signal: an `Error` constructed with
 * no arguments, so `message` is the empty string and the identity sits on another property.
 */
const messagelessError = (extras: Record<string, string> = {}): Error =>
  // eslint-disable-next-line unicorn/error-message -- an empty message is exactly what is under test
  Object.assign(new Error(), extras);

const capturedError = (): Error => capturedCalls[0]?.[0] as Error;

describe('onRequestError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCalls.length = 0;
  });

  it('reports an error that has a message unchanged', async () => {
    const error = new Error('database connection refused');

    await onRequestError(error, emptyRequest, {});

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(capturedError()).toBe(error);
  });

  it("names a messageless error by its 'code' so the PostHog issue is readable", async () => {
    // What Next.js throws when a route cannot produce a static shell: an empty `Error` with the
    // real diagnostic printed through `console.error` instead of attached to the error.
    // see: https://github.com/cevi/conveniat-webpage/issues/1582
    await onRequestError(messagelessError({ code: 'NEXT_STATIC_GEN_BAILOUT' }), emptyRequest, {});

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(capturedError().message).toBe('NEXT_STATIC_GEN_BAILOUT');
  });

  it('keeps the stack of a messageless error so the reported frames still point at the throw', async () => {
    const bailout = messagelessError({ code: 'NEXT_STATIC_GEN_BAILOUT' });

    await onRequestError(bailout, emptyRequest, {});

    expect(capturedError().stack).toBe(bailout.stack);
  });

  it("names a messageless error by its 'digest' when it has one", async () => {
    await onRequestError(
      messagelessError({ digest: 'NEXT_REDIRECT;replace;/de;307;' }),
      emptyRequest,
      {},
    );

    expect(capturedError().message).toBe('NEXT_REDIRECT;replace;/de;307;');
  });

  it('falls back to the constructor name when the error carries nothing else', async () => {
    class TimeoutError extends Error {}

    await onRequestError(new TimeoutError(), emptyRequest, {});

    expect(capturedError().message).toBe('TimeoutError');
  });

  it('still drops a not-found sentinel instead of reporting it under its digest', async () => {
    await onRequestError(messagelessError({ digest: 'NEXT_NOT_FOUND' }), emptyRequest, {});

    expect(captureException).not.toHaveBeenCalled();
  });
});
