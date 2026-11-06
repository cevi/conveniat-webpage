import { ROOT_CONTEXT, SpanKind, trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { asInstrumentalCollection } from '@/features/payload-cms/payload-cms/utils/instrumentalized-collection';
import { RequestSpanProcessor } from '@/lib/request-span';

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  spanProcessors: [new RequestSpanProcessor(), new SimpleSpanProcessor(exporter)],
});
trace.setGlobalTracerProvider(provider);

type Hook = (args: Record<string, unknown>) => unknown;

/** Runs one operation through the hooks the wrapper adds, the way Payload calls them. */
const runOperation = async (
  slug: string,
  operation: string,
  args: Record<string, unknown>,
  result: unknown,
  request: Record<string, unknown>,
): Promise<void> => {
  const config = asInstrumentalCollection({ slug, fields: [] });
  const collection = { slug };
  for (const hook of (config.hooks?.beforeOperation ?? []) as unknown as Hook[]) {
    await hook({ args, collection, operation, req: request });
  }
  for (const hook of (config.hooks?.afterOperation ?? []) as unknown as Hook[]) {
    await hook({ args, collection, operation, req: request, result });
  }
};

const attributesOf = (name: string): Record<string, unknown> =>
  exporter.getFinishedSpans().find((span) => span.name === name)?.attributes ?? {};

afterEach(() => {
  jest.restoreAllMocks();
  exporter.reset();
});

describe('asInstrumentalCollection', () => {
  it('tells on the request span who it was and which documents it touched', async () => {
    const tracer = provider.getTracer('test');
    const server = tracer.startSpan('POST /api/[...slug]', { kind: SpanKind.SERVER });
    const handler = tracer.startSpan('handler', {}, trace.setSpan(ROOT_CONTEXT, server));
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue(handler);

    const request = {
      user: { id: 'user-1', collection: 'users', _strategy: 'local-jwt', email: 'a@b.ch' },
      payloadAPI: 'REST',
      locale: 'de',
      context: {},
    };
    await runOperation('payload-preferences', 'read', { id: 'pref-1' }, { id: 'pref-1' }, request);
    await runOperation(
      'generic-page',
      'update',
      { id: 'page-1', draft: true },
      { id: 'page-1' },
      request,
    );
    await runOperation('generic-page', 'create', { data: {} }, { id: 'page-2' }, request);
    handler.end();
    server.end();

    expect(attributesOf('POST /api/[...slug]')).toStrictEqual({
      'user.id': 'user-1',
      'user.collection': 'users',
      'user.auth_strategy': 'local-jwt',
      'payload.api': 'REST',
      // Payload's own collections stay off the list; the email never reaches a span
      'payload.operations': ['generic-page.update', 'generic-page.create'],
      'payload.documents': ['generic-page/page-1', 'generic-page/page-2'],
    });
    expect(attributesOf('payload.generic-page.update')).toMatchObject({
      'payload.doc.id': 'page-1',
      'payload.draft': true,
    });
    expect(attributesOf('payload.generic-page.create')).toMatchObject({
      'payload.doc.id': 'page-2',
    });
  });
});
