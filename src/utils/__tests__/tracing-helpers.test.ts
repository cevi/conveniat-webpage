import type { Attributes, Span, SpanStatus, TracerProvider } from '@opentelemetry/api';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { notFound } from 'next/navigation';

// `withSpan` short-circuits to a no-op span during the build phase, and `isBuildPhase()` is
// true whenever `DATABASE_URI` is unset, which it is under Jest.
jest.mock('@/utils/build-phase', () => ({
  isBuildPhase: (): boolean => false,
}));

import { withRetries, withSpan } from '@/utils/tracing-helpers';

interface RecordedSpan {
  name: string;
  attributes: Attributes;
  status?: SpanStatus;
  exceptions: unknown[];
  ended: boolean;
}

let spans: RecordedSpan[] = [];

beforeAll(() => {
  const tracer = {
    startActiveSpan: <T>(
      name: string,
      options: { attributes?: Attributes },
      callback: (span: Span) => T,
    ): T => {
      const recorded: RecordedSpan = {
        name,
        attributes: { ...options.attributes },
        exceptions: [],
        ended: false,
      };
      spans.push(recorded);
      const span = {
        setAttribute: (key: string, value: Attributes[string]): Span => {
          recorded.attributes[key] = value;
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
        recordException: (exception: unknown): void => {
          recorded.exceptions.push(exception);
        },
        end: (): void => {
          recorded.ended = true;
        },
      } as unknown as Span;
      return callback(span);
    },
  };
  trace.setGlobalTracerProvider({ getTracer: () => tracer } as unknown as TracerProvider);
});

beforeEach(() => {
  spans = [];
});

describe('withSpan', () => {
  it('leaves a successful span unset and ends it', async () => {
    await expect(withSpan('ok', () => Promise.resolve(42))).resolves.toBe(42);

    expect(spans[0]?.status).toBeUndefined();
    expect(spans[0]?.exceptions).toHaveLength(0);
    expect(spans[0]?.ended).toBe(true);
  });

  it('marks a thrown error as ERROR, records it once and rethrows it', async () => {
    const error = new TypeError('boom');

    await expect(withSpan('fails', () => Promise.reject(error))).rejects.toBe(error);

    expect(spans[0]?.status).toEqual({ code: SpanStatusCode.ERROR, message: 'boom' });
    expect(spans[0]?.exceptions).toEqual([error]);
    expect(spans[0]?.attributes['error.type']).toBe('TypeError');
    expect(spans[0]?.ended).toBe(true);
  });

  it('marks a thrown non-Error value as ERROR', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    await expect(withSpan('fails', () => Promise.reject('plain string'))).rejects.toBe(
      'plain string',
    );

    expect(spans[0]?.status).toEqual({ code: SpanStatusCode.ERROR, message: 'plain string' });
    expect(spans[0]?.ended).toBe(true);
  });

  it('lets notFound() through without marking the span as failed', async () => {
    await expect(
      withSpan('preview', () => {
        notFound();
      }),
    ).rejects.toThrow();

    expect(spans[0]?.status).toBeUndefined();
    expect(spans[0]?.exceptions).toHaveLength(0);
    expect(spans[0]?.ended).toBe(true);
  });
});

describe('withRetries', () => {
  it('marks the failed attempt as ERROR and the successful one not', async () => {
    let calls = 0;
    const result = await withRetries(
      'job',
      () => {
        calls += 1;
        return calls === 1 ? Promise.reject(new Error('flaky')) : Promise.resolve('done');
      },
      { maxAttempts: 2, backoffMs: () => 0 },
    );

    expect(result).toBe('done');
    expect(spans.map((span) => [span.name, span.status?.code])).toEqual([
      ['job:1', SpanStatusCode.ERROR],
      ['job:2', undefined],
    ]);
  });
});
