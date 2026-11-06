import { trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

// `withSpan` short-circuits to a no-op span during the build phase, and `isBuildPhase()` is
// true whenever `DATABASE_URI` is unset, which it is under Jest.
jest.mock('@/utils/build-phase', () => ({
  isBuildPhase: (): boolean => false,
}));
jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn() };
  return { createLogger: (): typeof logger => logger };
});

import { HitobitoClient } from '@/lib/hitobito/client';
import { routeTemplate } from '@/lib/hitobito/request-metrics';

const BASE_URL = 'https://db.cevi.ch';
const exporter = new InMemorySpanExporter();
const originalFetch = globalThis.fetch;

beforeAll(() => {
  trace.setGlobalTracerProvider(
    new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }),
  );
});

afterAll(() => {
  trace.disable();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  exporter.reset();
});

const answerWith = (status: number, body: string): void => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    url: '',
    headers: new Headers(),
    text: () => Promise.resolve(body),
  });
};

const client = (): HitobitoClient =>
  new HitobitoClient({ baseUrl: BASE_URL, apiToken: 'token', browserCookie: 'session' });

describe('routeTemplate', () => {
  it.each([
    ['/api/people/18499', '/api/people/:id'],
    ['/groups/4105/people.json', '/groups/:id/people.json'],
    [
      '/groups/4502/events/5393/participations/111700/edit',
      '/groups/:id/events/:id/participations/:id/edit',
    ],
    [`${BASE_URL}/api/event_participations?page[number]=2`, '/api/event_participations'],
    ['/api/groups', '/api/groups'],
  ])('turns %s into %s', (path, route) => {
    expect(routeTemplate(path)).toBe(route);
  });
});

describe('HitobitoClient spans', () => {
  it('names an API request after its route and keeps the concrete path as an attribute', async () => {
    answerWith(200, '{"data":{}}');

    await client().apiRequest('GET', '/api/people/18499');

    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe('HitobitoClient.apiRequest:GET /api/people/:id');
    expect(span?.attributes).toMatchObject({
      'http.route': '/api/people/:id',
      'url.path': '/api/people/18499',
    });
  });

  it('keeps the query of a search off the span, which names people', async () => {
    answerWith(200, '{"data":[]}');

    await client().apiRequest('GET', '/api/people', {
      params: { 'filter[first_name]': 'Anna', 'filter[email]': 'anna@example.org' },
    });

    const [span] = exporter.getFinishedSpans();
    expect(span?.attributes['url.path']).toBe('/api/people');
    expect(JSON.stringify(span?.attributes)).not.toMatch(/Anna|anna@example\.org/);
  });

  it('gives requests for two people the same span name', async () => {
    answerWith(200, '{"data":{}}');

    await client().apiRequest('GET', '/api/people/18499');
    await client().apiRequest('GET', '/api/people/41838');

    const names = new Set(exporter.getFinishedSpans().map((span) => span.name));
    expect(names).toEqual(new Set(['HitobitoClient.apiRequest:GET /api/people/:id']));
  });

  it('names a frontend request after its route', async () => {
    answerWith(200, '<html></html>');

    await client().frontendRequest('GET', '/groups/4502/events/5393/participations/111700/edit');

    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe(
      'HitobitoClient.frontendRequest:GET /groups/:id/events/:id/participations/:id/edit',
    );
    expect(span?.attributes['url.path']).toBe(
      '/groups/4502/events/5393/participations/111700/edit',
    );
  });
});
