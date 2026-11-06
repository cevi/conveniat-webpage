import { SpanKind, trace } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

/**
 * What a request did, written onto the span of the request itself.
 *
 * Next.js opens the server span of a request, and the code that knows what the request is
 * about, a Payload hook, the MCP handler, a tRPC procedure, runs several spans further down,
 * without a reference to it. The OpenTelemetry API gives no way up to a parent. So this
 * processor remembers the open server spans of every trace, and `annotateRequest` writes to
 * them from wherever the request is: a slow request in Tempo then says which user it was,
 * which collection and document it touched and which MCP tool it ran, on the one span the
 * "Slow requests" table on the dashboard lists.
 *
 * Kept on `globalThis`: `src/tracing.ts` registers the processor from the instrumentation
 * bundle, and the callers live in the app's route bundles, which do not share module state.
 *
 * Values are ids and fixed names only, never a name, an email address or a query string.
 */

/** Server spans still open, and the list attributes collected for them, by trace id. */
interface OpenRequest {
  spans: Span[];
  lists: Map<string, string[]>;
}

const REGISTRY_KEY = Symbol.for('conveniat27.openRequestSpans');

/**
 * A request whose server span never ended would stay here for good. No more than this many
 * are open at once on a healthy replica; past it the oldest are dropped.
 */
const MAX_OPEN_REQUESTS = 5000;

/** Entries a list attribute takes before it stops growing, so one bulk request stays small. */
const MAX_LIST_ENTRIES = 20;

const registry = (): Map<string, OpenRequest> => {
  const holder = globalThis as unknown as Record<symbol, Map<string, OpenRequest> | undefined>;
  const existing = holder[REGISTRY_KEY];
  if (existing) return existing;
  const created = new Map<string, OpenRequest>();
  holder[REGISTRY_KEY] = created;
  return created;
};

/** Remembers the server spans of every request while they are open. */
export class RequestSpanProcessor implements SpanProcessor {
  onStart(span: Span): void {
    if (span.kind !== SpanKind.SERVER) return;
    const open = registry();
    const traceId = span.spanContext().traceId;
    const request = open.get(traceId);
    if (request) {
      request.spans.push(span);
      return;
    }
    if (open.size >= MAX_OPEN_REQUESTS) {
      const oldest = open.keys().next().value;
      if (oldest !== undefined) open.delete(oldest);
    }
    open.set(traceId, { spans: [span], lists: new Map() });
  }

  onEnd(span: ReadableSpan): void {
    if (span.kind !== SpanKind.SERVER) return;
    const open = registry();
    const traceId = span.spanContext().traceId;
    const request = open.get(traceId);
    if (!request) return;
    request.spans = request.spans.filter(
      (candidate) => candidate.spanContext().spanId !== span.spanContext().spanId,
    );
    if (request.spans.length === 0) open.delete(traceId);
  }

  forceFlush(): Promise<void> {
    // holds no spans for export
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    registry().clear();
    return Promise.resolve();
  }
}

const currentRequest = (): OpenRequest | undefined => {
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  return traceId === undefined ? undefined : registry().get(traceId);
};

/**
 * Sets attributes on the server spans of the request the caller runs in. Does nothing outside
 * a request, in a job or during the build.
 */
export function annotateRequest(
  attributes: Record<string, string | number | boolean | undefined>,
): void {
  const request = currentRequest();
  if (!request) return;
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    for (const span of request.spans) span.setAttribute(key, value);
  }
}

/**
 * Adds `value` to the list attribute `key` of the current request, once, like every
 * collection and operation one request ran. Stops at twenty entries.
 */
export function appendToRequest(key: string, value: string): void {
  const request = currentRequest();
  if (!request) return;
  const list = request.lists.get(key) ?? [];
  if (list.includes(value) || list.length >= MAX_LIST_ENTRIES) return;
  list.push(value);
  request.lists.set(key, list);
  for (const span of request.spans) span.setAttribute(key, [...list]);
}
