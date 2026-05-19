import { isBuildPhase } from '@/utils/build-phase';
import { trace, type Attributes, type Span } from '@opentelemetry/api';

/**
 * Wraps an async function execution in a named span.
 * Automatically handles error recording and span ending.
 *
 * @param name The name of the span
 * @param callback The async function to execute
 * @param attributes Optional attributes to add to the span
 */
export async function withSpan<T>(
  name: string,
  callback: (span: Span) => Promise<T>,
  attributes?: Attributes,
): Promise<T> {
  // Skip tracing during build-time prerendering AND dev-mode prerendering.
  // The OpenTelemetry tracer internally calls Date.now() inside startActiveSpan(),
  // which Next.js 16 forbids in Server Components before accessing uncached data
  // (cookies(), headers(), connection()) or fetch(). This affects both production
  // builds (NEXT_PHASE === PHASE_PRODUCTION_BUILD) and dev-mode prerendering.
  // eslint-disable-next-line n/no-process-env
  if (isBuildPhase() || process.env['NODE_ENV'] === 'development') {
    const dummySpan = {
      end: () => {},
      recordException: () => {},
    } as unknown as Span;
    return await callback(dummySpan);
  }

  const tracer = trace.getTracer('conveniat-app');
  return await tracer.startActiveSpan(name, { attributes: attributes ?? {} }, async (span) => {
    try {
      return await callback(span);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
