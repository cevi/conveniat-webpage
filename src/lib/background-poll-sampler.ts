import type { Attributes, Context, Link, SpanKind } from '@opentelemetry/api';
import { isSpanContextValid, trace } from '@opentelemetry/api';
import type { Sampler, SamplingResult } from '@opentelemetry/sdk-trace-base';
import { SamplingDecision } from '@opentelemetry/sdk-trace-base';

/**
 * Collections the job runner and the worker heartbeat poll on their own schedule, outside any
 * request: `payload-jobs` for due jobs, `payload-workers` for the heartbeat that spares a job a
 * live worker is still running.
 */
const POLLED_SPAN_PREFIXES = [
  'mongoose.payload-jobs.',
  'mongoose.payload-workers.',
  'payload.payload-jobs.',
  'payload.payload-workers.',
] as const;

/** The scheduler writes its bookkeeping into this global on every tick. */
const SCHEDULER_STATS_GLOBAL = '"globalType":"payload-jobs-stats"';

const isSchedulerStatsWrite = (spanName: string, attributes: Attributes): boolean => {
  if (spanName !== 'mongoose.globals.updateOne') return false;
  const statement = attributes['db.statement'];
  return typeof statement === 'string' && statement.includes(SCHEDULER_STATS_GLOBAL);
};

/**
 * Drops the traces of the job runner's and the worker heartbeat's polling, and delegates every
 * other span.
 *
 * Each poll runs outside a request, so every query becomes a trace of its own: in September
 * 2026 they made up well over half of all spans on every deployment (hundreds of thousands a
 * day, against about 20,000 health-check spans), and they fill the Tempo budget the three
 * deployments share. They say nothing a trace could explain: a job that runs gets spans of its
 * own from `instrument-task.ts`, and a failing poll is logged.
 *
 * Only root spans are matched. The same query inside a request or a job keeps its trace, and
 * the children of a dropped poll disappear with it, because the delegate is parent based.
 */
export class BackgroundPollSampler implements Sampler {
  constructor(private readonly delegate: Sampler) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    const parent = trace.getSpanContext(context);
    const isRoot = parent === undefined || !isSpanContextValid(parent);
    const isPoll =
      POLLED_SPAN_PREFIXES.some((prefix) => spanName.startsWith(prefix)) ||
      isSchedulerStatsWrite(spanName, attributes);

    if (isRoot && isPoll) return { decision: SamplingDecision.NOT_RECORD };

    return this.delegate.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `BackgroundPollSampler{${this.delegate.toString()}}`;
  }
}
