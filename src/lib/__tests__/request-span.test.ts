import type { Span } from '@opentelemetry/api';
import { ROOT_CONTEXT, SpanKind, trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { recordMcpEvent } from '@/features/payload-cms/payload-cms/plugins/mcp/mcp-telemetry';
import { annotateRequest, appendToRequest, RequestSpanProcessor } from '@/lib/request-span';

const exporter = new InMemorySpanExporter();
const tracer = new BasicTracerProvider({
  spanProcessors: [new RequestSpanProcessor(), new SimpleSpanProcessor(exporter)],
}).getTracer('test');

/** A request as Next.js opens it: a server span, and the code running in a span below it. */
const startRequest = (): { server: Span; inner: Span } => {
  const server = tracer.startSpan('POST /api/[...slug]', { kind: SpanKind.SERVER });
  const inner = tracer.startSpan(
    'payload.generic-page.update',
    {},
    trace.setSpan(ROOT_CONTEXT, server),
  );
  jest.spyOn(trace, 'getActiveSpan').mockReturnValue(inner);
  return { server, inner };
};

const exported = (name: string): Record<string, unknown> =>
  exporter.getFinishedSpans().find((span) => span.name === name)?.attributes ?? {};

afterEach(() => {
  jest.restoreAllMocks();
  exporter.reset();
});

describe('annotateRequest', () => {
  it('writes onto the request span from code running further down', () => {
    const { server, inner } = startRequest();

    annotateRequest({ 'user.id': 'user-1', 'user.collection': undefined });
    appendToRequest('payload.documents', 'generic-page/abc');
    appendToRequest('payload.documents', 'generic-page/abc');
    appendToRequest('payload.documents', 'forms/def');
    inner.end();
    server.end();

    expect(exported('POST /api/[...slug]')).toStrictEqual({
      'user.id': 'user-1',
      'payload.documents': ['generic-page/abc', 'forms/def'],
    });
    expect(exported('payload.generic-page.update')).toStrictEqual({});
  });

  it('does nothing once the request has ended, or outside any request', () => {
    const { server, inner } = startRequest();
    inner.end();
    server.end();

    annotateRequest({ 'user.id': 'late' });
    // without a context manager, as in a job or the build, there is no active span
    jest.restoreAllMocks();
    annotateRequest({ 'user.id': 'nowhere' });

    expect(exported('POST /api/[...slug]')).toStrictEqual({});
  });
});

describe('recordMcpEvent', () => {
  it('names the method and tool of an MCP call, but not its arguments', () => {
    const { server, inner } = startRequest();

    recordMcpEvent({
      type: 'REQUEST_COMPLETED',
      method: 'tools/call',
      status: 'success',
      result: {
        method: 'tools/call',
        params: { name: 'updateGenericPage', arguments: { title: 'x' } },
      },
    });
    inner.end();
    server.end();

    expect(exported('POST /api/[...slug]')).toStrictEqual({
      'mcp.method': 'tools/call',
      'mcp.tool': 'updateGenericPage',
      'mcp.status': 'success',
    });
  });

  it('marks a failed call without quoting its error, which may contain the request', () => {
    const { server, inner } = startRequest();

    recordMcpEvent({ type: 'ERROR', error: 'cannot update "Lagerhaus Züri 11"' });
    inner.end();
    server.end();

    expect(exported('POST /api/[...slug]')).toStrictEqual({ 'mcp.status': 'error' });
  });
});
