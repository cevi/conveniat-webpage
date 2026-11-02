/**
 * Runs once per server instance, in every runtime Next.js compiles this file for.
 *
 * The Node-only work is behind a dynamic import so it never reaches the Edge instrumentation
 * bundle. Nothing in `@/tracing` — the `NodeSDK`, the Prometheus HTTP server, the `node:v8`
 * heap statistics — can run on Edge anyway, so there is nothing to register there.
 */
export const register = async (): Promise<void> => {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const { registerNodeInstrumentation } = await import('./instrumentation-node');
  registerNodeInstrumentation();

  // Not awaited: initializing Payload reaches the database and, on an empty one, seeds it. The
  // server must accept requests while that happens, as it did when the first admin request
  // triggered it.
  const { startJobsRunner } = await import('./instrumentation-jobs');
  void startJobsRunner();
};

/**
 * Names an error whose `message` is empty.
 *
 * Next.js throws bail-out and control-flow sentinels as a bare `new Error()` and keeps the
 * identity somewhere other than `message`: `StaticGenBailoutError` carries
 * `code: 'NEXT_STATIC_GEN_BAILOUT'` and prints the reason through `console.error` right before
 * throwing, `redirect()` and `notFound()` carry only a `digest`. Captured as they are, all of
 * them reach PostHog with an empty `$exception_message` and collapse into one issue titled
 * "Error" that names neither the route nor the reason.
 * see: https://github.com/cevi/conveniat-webpage/issues/1582
 *
 * The constructor name comes last because a production bundle minifies it —
 * `StaticGenBailoutError` ships as `tE` — so it only identifies the error in development.
 */
const describeMessagelessError = (error: object): string => {
  if ('digest' in error && typeof error.digest === 'string' && error.digest !== '') {
    return error.digest;
  }
  if ('code' in error && typeof error.code === 'string' && error.code !== '') {
    return error.code;
  }
  const constructorName: unknown = (error as { constructor?: { name?: unknown } }).constructor
    ?.name;
  return typeof constructorName === 'string' && constructorName !== '' ? constructorName : 'Error';
};

/**
 * The error handed to PostHog. One that already has a message is reported unchanged. One without
 * a message is reported through a stand-in carrying the description and the original stack, so
 * the issue is readable and still points at the frames that threw.
 */
const toReportableError = (error: unknown): unknown => {
  if (error === null || typeof error !== 'object') return error;
  if ('message' in error && typeof error.message === 'string' && error.message !== '') return error;

  const reportable = new Error(describeMessagelessError(error));
  if ('name' in error && typeof error.name === 'string' && error.name !== '') {
    reportable.name = error.name;
  }
  if ('stack' in error && typeof error.stack === 'string') {
    reportable.stack = error.stack;
  }
  return reportable;
};

/** What an error says about itself: its message and, for a Next.js sentinel, its digest. */
const readErrorIdentity = (error: unknown): { errorMessage: string; digest: unknown } => {
  if (typeof error === 'string') return { errorMessage: error, digest: undefined };
  if (error === null || typeof error !== 'object') return { errorMessage: '', digest: undefined };
  return {
    errorMessage: 'message' in error && typeof error.message === 'string' ? error.message : '',
    digest: 'digest' in error ? error.digest : undefined,
  };
};

const isNotFound = (errorMessage: string, digest: unknown): boolean =>
  digest === 'NEXT_NOT_FOUND' ||
  (typeof digest === 'string' && digest.includes('404')) ||
  errorMessage.includes('NEXT_NOT_FOUND') ||
  errorMessage.includes('404') ||
  errorMessage.includes('PAGE_NOT_FOUND_ERROR') ||
  errorMessage.includes('PAGE_NOT_FOUND');

export const onRequestError = async (
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: unknown,
): Promise<void> => {
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { errorMessage, digest } = readErrorIdentity(error);
    if (isNotFound(errorMessage, digest)) return;

    const { noiseMessages } = await import('@/utils/posthog-filters');
    if (noiseMessages.some((message) => errorMessage.includes(message))) return;

    // Next.js invokes `onRequestError` inside the request's span context (its tracer enters
    // every span through `context.with(trace.setSpan(...))`), so the active span is the one the
    // failing render was recorded under.
    const { trace, INVALID_TRACEID, SpanStatusCode, TraceFlags } =
      await import('@opentelemetry/api');
    const activeSpan = trace.getActiveSpan();

    // The collector in front of Tempo keeps every trace with a span in status ERROR and only a
    // share of the rest. An error React recovered from, or one reported after the render, leaves
    // the span OK, and its trace would be sampled away like any successful request. Marked here,
    // every reported error keeps its trace, on both deployments, with or without PostHog.
    activeSpan?.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
    if (error instanceof Error) activeSpan?.recordException(error);

    // Imported lazily for the same reason the tracing setup is: this module is compiled
    // for the Edge runtime too, and the logger reaches for `node:os` at import time.
    const { createLogger } = await import('./utils/server-logger');
    const logger = createLogger('instrumentation');

    const { getPostHogServer } = await import('./lib/posthog-server');
    const posthog = getPostHogServer();
    if (posthog === undefined) return;

    let distinctId: string | undefined;

    const cookieHeader = request.headers['cookie'];
    if (cookieHeader !== undefined) {
      // Normalize multiple cookie arrays to string
      const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

      const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);

      if (postHogCookieMatch?.[1] !== undefined) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          const postHogData = JSON.parse(decodedCookie) as Record<string, unknown>;
          if (typeof postHogData['distinct_id'] === 'string') {
            distinctId = postHogData['distinct_id'];
          }
        } catch (error_) {
          logger.warn('Could not parse the PostHog cookie', { error: error_ });
        }
      }
    }

    // Extract properties for better tracing
    const properties: Record<string, unknown> = {};

    if (context !== null && typeof context === 'object' && !Array.isArray(context)) {
      Object.assign(properties, context);
    }

    // `path` is the request URL with its query string, which can carry a `preview-token`, so
    // only the pathname is reported. Under `$pathname` the issue page breaks errors down by it.
    properties['$pathname'] = request.path.split('?')[0];
    properties['method'] = request.method;

    // Which branch of the server action handler a POST took depends on these two: a fetch
    // action sends `next-action`, a form post without it falls through to a page render.
    if (request.headers['content-type'] !== undefined)
      properties['content-type'] = request.headers['content-type'];
    if (request.headers['next-action'] !== undefined)
      properties['next-action'] = request.headers['next-action'];

    if (request.headers['referer'] !== undefined)
      properties['referer'] = request.headers['referer'];
    if (request.headers['user-agent'] !== undefined)
      properties['user-agent'] = request.headers['user-agent'];
    if (request.headers['x-forwarded-for'] !== undefined)
      properties['x-forwarded-for'] = request.headers['x-forwarded-for'];

    // Joins the PostHog issue to the Tempo trace and to the Loki lines of the same request.
    // They are named `trace_id` / `span_id` rather than `$exception_*` so PostHog keeps them as
    // plain, filterable event properties, and to match what the log pipeline already writes in
    // `otel-log-destination.ts`.
    //
    // Both are best effort: without a registered SDK, or for an error that escapes the span,
    // `getActiveSpan()` is undefined and the report goes out without them. `trace_sampled` is
    // false when the application itself dropped the trace at the root; a trace it kept reaches
    // the collector, which keeps it because of the status set above.
    const spanContext = activeSpan?.spanContext();
    if (spanContext !== undefined && spanContext.traceId !== INVALID_TRACEID) {
      properties['trace_id'] = spanContext.traceId;
      properties['span_id'] = spanContext.spanId;
      properties['trace_sampled'] = (spanContext.traceFlags & TraceFlags.SAMPLED) !== 0;
    }

    if (digest !== undefined) properties['digest'] = digest;
    if (errorMessage !== '' && typeof error !== 'string') properties['errorMessage'] = errorMessage;

    posthog.captureException(toReportableError(error), distinctId, properties);

    try {
      await posthog.flush();
    } catch (flushError) {
      logger.error('Failed to flush the PostHog events', { error: flushError });
    }
  }
};
