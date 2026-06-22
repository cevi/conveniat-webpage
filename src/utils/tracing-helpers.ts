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

/**
 * Wraps an async function execution in a named span (higher-order function / decorator pattern).
 *
 * @param nameOrFunction Span name or function that builds the span name from arguments
 * @param wrappedFunction The async function to execute
 * @param options Optional callbacks to extract attributes or run on success
 */
export function traceFunction<ArgumentsType extends unknown[], Return>(
  nameOrFunction: string | ((...args: ArgumentsType) => string),
  wrappedFunction: (...args: ArgumentsType) => Promise<Return>,
  options?: {
    getAttributes?: (...args: ArgumentsType) => Attributes;
    onSuccess?: (span: Span, result: Return) => void;
  },
): (...args: ArgumentsType) => Promise<Return> {
  return async (...args: ArgumentsType): Promise<Return> => {
    const spanName =
      typeof nameOrFunction === 'function' ? nameOrFunction(...args) : nameOrFunction;
    const spanAttributes = options?.getAttributes ? options.getAttributes(...args) : {};
    return withSpan(
      spanName,
      async (span) => {
        span.setAttributes(spanAttributes);
        const result = await wrappedFunction(...args);
        if (options?.onSuccess) {
          options.onSuccess(span, result);
        }
        return result;
      },
      spanAttributes,
    );
  };
}

/**
 * Wraps an async class method execution in a named span, retaining correct lexical binding (this).
 *
 * @param nameOrFunction Span name or function that builds the span name from arguments
 * @param wrappedFunction The async class method to execute
 * @param options Optional callbacks to extract attributes or run on success
 */
export function traceMethod<This, ArgumentsType extends unknown[], Return>(
  nameOrFunction: string | ((this: This, ...args: ArgumentsType) => string),
  wrappedFunction: (this: This, ...args: ArgumentsType) => Promise<Return>,
  options?: {
    getAttributes?: (this: This, ...args: ArgumentsType) => Attributes;
    onSuccess?: (this: This, span: Span, result: Return) => void;
  },
): (this: This, ...args: ArgumentsType) => Promise<Return> {
  return async function (this: This, ...args: ArgumentsType): Promise<Return> {
    const spanName =
      typeof nameOrFunction === 'function' ? nameOrFunction.apply(this, args) : nameOrFunction;
    const spanAttributes = options?.getAttributes ? options.getAttributes.apply(this, args) : {};
    return withSpan(
      spanName,
      async (span) => {
        span.setAttributes(spanAttributes);
        const result = await wrappedFunction.apply(this, args);
        if (options?.onSuccess) {
          options.onSuccess.call(this, span, result);
        }
        return result;
      },
      spanAttributes,
    );
  };
}

/**
 * Executes a function with a retry loop, backoff, and individual attempt span tracking.
 *
 * @param namePrefix Span name prefix for each attempt (attempt number is appended)
 * @param wrappedFunction The async function to retry
 * @param options Configuration options including attempts, backoff, and success handler
 */
export async function withRetries<T>(
  namePrefix: string,
  wrappedFunction: (attempt: number) => Promise<T>,
  options: {
    maxAttempts: number;
    backoffMs: (attempt: number) => number;
    logger?: { warn: (message: string) => void };
    onAttemptSpan?: (span: Span, attempt: number, result?: T, error?: unknown) => void;
  },
): Promise<T> {
  let lastError: unknown = undefined;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    if (attempt > 1) {
      const delay = options.backoffMs(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const result = await withSpan(`${namePrefix}:${attempt}`, async (span) => {
        span.setAttribute('attempt', attempt);
        const attemptResult = await wrappedFunction(attempt);
        if (options.onAttemptSpan) {
          options.onAttemptSpan(span, attempt, attemptResult);
        }
        return attemptResult;
      });
      return result;
    } catch (error) {
      lastError = error;
      if (options.logger) {
        options.logger.warn(
          `${namePrefix} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  throw lastError;
}
