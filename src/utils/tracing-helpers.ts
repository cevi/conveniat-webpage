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
  // If we are in the build phase, we skip tracing to avoid Date.now() errors
  // during prerendering in Next.js Server Components.
  if (isBuildPhase()) {
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
