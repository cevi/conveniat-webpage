import type {
  Attributes,
  MeterProvider,
  Span,
  SpanStatus,
  TracerProvider,
} from '@opentelemetry/api';
import { metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import { initTRPC, TRPCError } from '@trpc/server';

// `withSpan` short-circuits to a no-op span during the build phase, and `isBuildPhase()` is
// true whenever `DATABASE_URI` is unset — which it is under Jest. The production path is the
// one worth covering here.
jest.mock('@/utils/build-phase', () => ({
  isBuildPhase: (): boolean => false,
}));

import { traceProcedure } from '@/trpc/middleware/tracing';

interface RecordedSpan {
  name: string;
  attributes: Attributes;
  status?: SpanStatus;
  ended: boolean;
}

interface RecordedSample {
  value: number;
  attributes: Attributes;
}

let spans: RecordedSpan[] = [];
let samples: RecordedSample[] = [];

// The middleware creates its histogram once and keeps it, so these accumulate across the whole
// file rather than being reset per test — which is itself the behaviour asserted below.
const histogramNames: string[] = [];
let bucketBoundaries: number[] | undefined;

const installTelemetry = (): void => {
  const tracer = {
    startActiveSpan: <T>(
      name: string,
      options: { attributes?: Attributes },
      callback: (span: Span) => T,
    ): T => {
      const recorded: RecordedSpan = {
        name,
        attributes: { ...options.attributes },
        ended: false,
      };
      spans.push(recorded);

      const span = {
        setAttribute: (key: string, value: unknown): Span => {
          recorded.attributes[key] = value as Attributes[string];
          return span;
        },
        setAttributes: (attributes: Attributes): Span => {
          Object.assign(recorded.attributes, attributes);
          return span;
        },
        setStatus: (status: SpanStatus): Span => {
          recorded.status = status;
          return span;
        },
        recordException: (): void => {},
        end: (): void => {
          recorded.ended = true;
        },
      } as unknown as Span;

      return callback(span);
    },
  };
  trace.setGlobalTracerProvider({ getTracer: () => tracer } as unknown as TracerProvider);

  const meter = {
    createHistogram: (
      name: string,
      options?: { advice?: { explicitBucketBoundaries?: number[] } },
    ): { record: (value: number, attributes: Attributes) => void } => {
      histogramNames.push(name);
      bucketBoundaries = options?.advice?.explicitBucketBoundaries;
      return {
        record: (value: number, attributes: Attributes): void => {
          samples.push({ value, attributes });
        },
      };
    },
  };
  metrics.setGlobalMeterProvider({ getMeter: () => meter } as unknown as MeterProvider);
};

/**
 * A router built the way `@/trpc/init` builds the real one, so the assertions below go through
 * tRPC's own middleware pipeline rather than calling `traceProcedure` by hand. `next()` reports
 * a failing procedure by returning `{ ok: false }` instead of throwing, which is exactly the
 * detail a hand-rolled call would get wrong.
 */
const t = initTRPC.create();
const tracing = t.middleware(
  async ({ path, type, next }) => await traceProcedure({ path, type, next }),
);
const procedure = t.procedure.use(tracing);

const router = t.router({
  chat: t.router({
    getMessageList: procedure.query(() => ['hello']),
    createMessage: procedure.mutation(() => 'created'),
    archiveChat: procedure.mutation(() => {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'no such chat' });
    }),
    explode: procedure.mutation(() => {
      throw new Error('boom');
    }),
  }),
});

const caller = t.createCallerFactory(router)({});

beforeEach(() => {
  spans = [];
  samples = [];
  installTelemetry();
});

afterEach(() => {
  trace.disable();
  metrics.disable();
});

describe('tRPC tracing middleware', () => {
  it('names the span after the procedure and ends it', async () => {
    await caller.chat.createMessage();

    expect(spans).toHaveLength(1);
    expect(spans[0]?.name).toBe('trpc.mutation chat.createMessage');
    expect(spans[0]?.ended).toBe(true);
    expect(spans[0]?.attributes).toMatchObject({
      'trpc.path': 'chat.createMessage',
      'trpc.type': 'mutation',
    });
    expect(spans[0]?.status).toBeUndefined();
  });

  it('records a duration sample in seconds for a successful query', async () => {
    await caller.chat.getMessageList();

    expect(samples).toHaveLength(1);
    expect(samples[0]?.attributes).toStrictEqual({
      'trpc.path': 'chat.getMessageList',
      'trpc.type': 'query',
      'trpc.error_code': 'ok',
    });
    // Seconds, not milliseconds: an in-process call cannot plausibly take a second.
    expect(samples[0]?.value).toBeGreaterThanOrEqual(0);
    expect(samples[0]?.value).toBeLessThan(1);
  });

  it('creates a single histogram with sub-second buckets', async () => {
    await caller.chat.getMessageList();

    expect(histogramNames).toStrictEqual(['trpc_procedure_duration_seconds']);
    expect(bucketBoundaries?.[0]).toBeLessThan(0.05);
  });

  it('labels an expected failure with its code without failing the span', async () => {
    await expect(caller.chat.archiveChat()).rejects.toThrow('no such chat');

    expect(spans[0]?.attributes['trpc.error_code']).toBe('NOT_FOUND');
    expect(spans[0]?.status).toBeUndefined();
    expect(spans[0]?.ended).toBe(true);
    expect(samples[0]?.attributes['trpc.error_code']).toBe('NOT_FOUND');
  });

  it('marks the span failed for a server fault', async () => {
    await expect(caller.chat.explode()).rejects.toThrow('boom');

    expect(spans[0]?.attributes['trpc.error_code']).toBe('INTERNAL_SERVER_ERROR');
    expect(spans[0]?.status?.code).toBe(SpanStatusCode.ERROR);
    expect(samples[0]?.attributes['trpc.error_code']).toBe('INTERNAL_SERVER_ERROR');
  });

  it('records one sample per call', async () => {
    await caller.chat.getMessageList();
    await caller.chat.createMessage();

    expect(samples).toHaveLength(2);
  });
});
