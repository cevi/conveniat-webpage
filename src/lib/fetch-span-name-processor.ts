import type { Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

/** The `next.span_type` Next.js 16 gives the span around a `fetch` it patched. */
const NEXT_FETCH_SPAN_TYPE = 'AppRender.fetch';

/**
 * The name of a Next.js fetch span without the path: `fetch GET db.cevi.ch`.
 *
 * Returns `undefined` when the URL cannot be parsed, so the span keeps the name it has.
 */
export function fetchSpanName(method: string, url: string): string | undefined {
  if (!URL.canParse(url)) return undefined;
  return `fetch ${method} ${new URL(url).host}`;
}

/**
 * Names the span Next.js opens around every server-side `fetch` after the host it calls,
 * instead of the full URL.
 *
 * Next.js names it `fetch GET https://db.cevi.ch/groups/4105/people.json`, ids and query
 * included. The span name is a label of the span metrics, so each Cevi.DB id became its own
 * latency histogram: about 1,000 names in a week of production, each used once. Every
 * request to Cevi.DB already runs inside a `HitobitoClient` span named after its route, and
 * the full URL stays on this span as `http.url`, so a trace search still finds one request.
 *
 * The attributes are set when the span starts, and the name is read when it is exported,
 * so renaming in `onStart` is enough.
 */
export class FetchSpanNameProcessor implements SpanProcessor {
  onStart(span: Span): void {
    if (span.attributes['next.span_type'] !== NEXT_FETCH_SPAN_TYPE) return;
    const method = span.attributes['http.method'];
    const url = span.attributes['http.url'];
    if (typeof method !== 'string' || typeof url !== 'string') return;
    const name = fetchSpanName(method, url);
    if (name !== undefined) span.updateName(name);
  }

  onEnd(): void {
    // nothing to do once the span has ended
  }

  async forceFlush(): Promise<void> {
    // holds no spans
  }

  async shutdown(): Promise<void> {
    // holds no spans
  }
}
