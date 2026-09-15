import { HealthCheckSampler } from '@/lib/health-check-sampler';
import { ROOT_CONTEXT, SpanKind } from '@opentelemetry/api';
import type { Sampler, SamplingResult } from '@opentelemetry/sdk-trace-base';
import { AlwaysOnSampler, SamplingDecision } from '@opentelemetry/sdk-trace-base';

const sample = (sampler: Sampler, attributes: Record<string, string>): SamplingResult =>
  sampler.shouldSample(ROOT_CONTEXT, 'trace-id', 'GET', SpanKind.SERVER, attributes, []);

describe('HealthCheckSampler', () => {
  it('does not record the /status health check', () => {
    const sampler = new HealthCheckSampler(new AlwaysOnSampler());

    // What Next.js sets at span start: the span is still named `GET` and only gets
    // renamed to `GET /status` once the response is finished.
    const result = sample(sampler, { 'http.method': 'GET', 'http.target': '/status' });

    expect(result.decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('does not record the health check when the path arrives as url.path', () => {
    const sampler = new HealthCheckSampler(new AlwaysOnSampler());

    const result = sample(sampler, { 'url.path': '/status' });

    expect(result.decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('does not record the health check when the probe appends a query string', () => {
    const sampler = new HealthCheckSampler(new AlwaysOnSampler());

    const result = sample(sampler, { 'http.target': '/status?from=swarm' });

    expect(result.decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('leaves the decision for another path to the delegate', () => {
    const sampler = new HealthCheckSampler(new AlwaysOnSampler());

    const result = sample(sampler, { 'http.method': 'GET', 'http.target': '/de/programm' });

    expect(result.decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('keeps the delegate decision for a page whose path starts with /status', () => {
    const dropEverything: Sampler = {
      shouldSample: () => ({ decision: SamplingDecision.NOT_RECORD }),
      toString: () => 'DropEverything',
    };
    const recordingSampler = new HealthCheckSampler(new AlwaysOnSampler());
    const droppingSampler = new HealthCheckSampler(dropEverything);

    const attributes = { 'http.target': '/status-page' };

    expect(sample(recordingSampler, attributes).decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    expect(sample(droppingSampler, attributes).decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('does not record the health check even when the delegate would sample it', () => {
    const sampleEverything: Sampler = {
      shouldSample: () => ({ decision: SamplingDecision.RECORD_AND_SAMPLED }),
      toString: () => 'SampleEverything',
    };
    const sampler = new HealthCheckSampler(sampleEverything);

    expect(sample(sampler, { 'http.target': '/status' }).decision).toBe(
      SamplingDecision.NOT_RECORD,
    );
  });
});
