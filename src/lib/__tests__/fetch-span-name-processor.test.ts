import { FetchSpanNameProcessor } from '@/lib/fetch-span-name-processor';
import { SpanKind } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

const exporter = new InMemorySpanExporter();
const tracer = new BasicTracerProvider({
  spanProcessors: [new FetchSpanNameProcessor(), new SimpleSpanProcessor(exporter)],
}).getTracer('test');

/** Ends a span opened the way Next.js 16 opens one, and returns the name it was exported as. */
const exportedName = (name: string, attributes: Record<string, string>): string | undefined => {
  exporter.reset();
  tracer.startSpan(name, { kind: SpanKind.CLIENT, attributes }).end();
  return exporter.getFinishedSpans()[0]?.name;
};

describe('FetchSpanNameProcessor', () => {
  it('names a Next.js fetch span after the host, without the ids in its path', () => {
    const url = 'https://db.cevi.ch/groups/4105/people.json?page=2';

    const name = exportedName(`fetch GET ${url}`, {
      'next.span_type': 'AppRender.fetch',
      'http.method': 'GET',
      'http.url': url,
    });

    expect(name).toBe('fetch GET db.cevi.ch');
  });

  it('keeps the port, which tells two local services apart', () => {
    const url = 'http://localhost:3001/oauth/token';

    const name = exportedName(`fetch POST ${url}`, {
      'next.span_type': 'AppRender.fetch',
      'http.method': 'POST',
      'http.url': url,
    });

    expect(name).toBe('fetch POST localhost:3001');
  });

  it('leaves a span that is not a Next.js fetch alone', () => {
    const name = exportedName('HitobitoClient.apiRequest:GET /api/people/:id', {
      'http.method': 'GET',
      'http.url': 'https://db.cevi.ch/api/people/18499',
    });

    expect(name).toBe('HitobitoClient.apiRequest:GET /api/people/:id');
  });

  it('keeps the name Next.js gave when the URL does not parse', () => {
    const name = exportedName('fetch GET', {
      'next.span_type': 'AppRender.fetch',
      'http.method': 'GET',
      'http.url': '',
    });

    expect(name).toBe('fetch GET');
  });
});
