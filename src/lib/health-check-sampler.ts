import type { Attributes, Context, Link, SpanKind } from '@opentelemetry/api';
import type { Sampler, SamplingResult } from '@opentelemetry/sdk-trace-base';
import { SamplingDecision } from '@opentelemetry/sdk-trace-base';

/** The health check probed by Docker, the swarm and the uptime monitor. */
const HEALTH_CHECK_PATH = '/status';

/**
 * The attributes Next.js 16 sets when the server span starts.
 *
 * `base-server.js` opens the request span with `http.target` set to `req.url` and only
 * renames it to `GET /status` once the response is finished, so the path is the single
 * thing available at sampling time. `url.path` is read as well, because the stable HTTP
 * semantic conventions renamed the attribute and an instrumentation upgrade would
 * otherwise silently turn the filter off.
 */
const PATH_ATTRIBUTES = ['http.target', 'url.path'] as const;

/** Strips the query string and fragment, so `/status?x=1` is recognised as the probe. */
const pathOf = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.split(/[#?]/)[0];
};

/**
 * Drops traces for the `/status` health check and delegates every other span.
 *
 * The probe runs several times a minute per replica, which made it the bulk of what we
 * ship to Tempo: over 24 hours in production, `GET /status` produced ≈ 12,000 server
 * spans and its unrouted parent `GET` another ≈ 12,000, against ≈ 2,000 spans for real
 * page requests. Tempo has a 4 GB budget shared by three deployments, so 92% of the
 * retention window was spent on a request that always returns the same 200 and that
 * nobody has ever debugged from a trace. Uptime is answered by the probe itself and by
 * the `/status` log line, not by its traces.
 *
 * Only the root span is matched. Its children carry no path attribute and are dropped
 * with it, because the delegate is parent based and sees an unsampled parent.
 *
 * Everything else keeps the configured head sampling ratio.
 */
export class HealthCheckSampler implements Sampler {
  constructor(private readonly delegate: Sampler) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    const isHealthCheck = PATH_ATTRIBUTES.some(
      (attribute) => pathOf(attributes[attribute]) === HEALTH_CHECK_PATH,
    );

    if (isHealthCheck) return { decision: SamplingDecision.NOT_RECORD };

    return this.delegate.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `HealthCheckSampler{${this.delegate.toString()}}`;
  }
}
