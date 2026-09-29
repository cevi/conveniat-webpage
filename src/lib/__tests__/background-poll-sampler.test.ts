import { BackgroundPollSampler } from '@/lib/background-poll-sampler';
import type { Context } from '@opentelemetry/api';
import { ROOT_CONTEXT, SpanKind, trace, TraceFlags } from '@opentelemetry/api';
import type { Sampler, SamplingResult } from '@opentelemetry/sdk-trace-base';
import { AlwaysOnSampler, SamplingDecision } from '@opentelemetry/sdk-trace-base';

/** Inside a request or a job: a context carrying a sampled parent span. */
const insideRequest: Context = trace.setSpanContext(ROOT_CONTEXT, {
  traceId: '0af7651916cd43dd8448eb211c80319c',
  spanId: 'b7ad6b7169203331',
  traceFlags: TraceFlags.SAMPLED,
});

const sample = (
  spanName: string,
  {
    context = ROOT_CONTEXT,
    attributes = {},
  }: { context?: Context; attributes?: Record<string, string> } = {},
): SamplingResult => {
  const sampler: Sampler = new BackgroundPollSampler(new AlwaysOnSampler());
  return sampler.shouldSample(context, 'trace-id', spanName, SpanKind.CLIENT, attributes, []);
};

describe('BackgroundPollSampler', () => {
  it.each([
    'mongoose.payload-jobs.find',
    'mongoose.payload-jobs.countDocuments',
    'mongoose.payload-workers.save',
    'payload.payload-workers.read',
  ])('does not record the background poll %s', (spanName) => {
    expect(sample(spanName).decision).toBe(SamplingDecision.NOT_RECORD);
  });

  // Statements as the mongoose instrumentation records them in production.
  it.each([
    [
      'mongoose.globals.findOne',
      'findOne {"condition":{"$and":[{"globalType":{"$eq":"payload-jobs-stats"}}]},"options":{},"fields":{}}',
    ],
    [
      'mongoose.globals.updateOne',
      'updateOne {"condition":{"globalType":"payload-jobs-stats"},"updates":{"globalType":"payload-jobs-stats","stats":{}}}',
    ],
  ])("does not record the scheduler's bookkeeping %s", (spanName, statement) => {
    const result = sample(spanName, { attributes: { 'db.statement': statement } });

    expect(result.decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('keeps an editor saving a global', () => {
    const result = sample('mongoose.globals.updateOne', {
      attributes: { 'db.statement': 'updateOne {"condition":{"globalType":"PWA"}}' },
    });

    expect(result.decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('keeps the same query when it runs inside a request or a job', () => {
    const result = sample('mongoose.payload-jobs.find', { context: insideRequest });

    expect(result.decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('leaves every other span to the delegate', () => {
    expect(sample('mongoose.chats.find').decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });
});
