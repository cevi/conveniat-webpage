import type { Attributes, MeterProvider } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';

jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { createLogger: (): typeof logger => logger };
});

import { HitobitoClient } from '@/lib/hitobito/client';
import { SessionExpiredError } from '@/lib/hitobito/errors';

interface Sample {
  name: string;
  value: number;
  attributes: Attributes;
}

const samples: Sample[] = [];

// The histogram is created on first use and kept, so the fake provider has to be in place
// before the first request of the file.
metrics.setGlobalMeterProvider({
  getMeter: (): object => ({
    createHistogram: (
      name: string,
    ): { record: (value: number, attributes?: Attributes) => void } => ({
      record: (value: number, attributes: Attributes = {}): void => {
        samples.push({ name, value, attributes });
      },
    }),
  }),
} as unknown as MeterProvider);

const BASE_URL = 'https://db.cevi.ch';
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  samples.length = 0;
});

const answerWith = (status: number, body: string, headers: HeadersInit = {}): void => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    url: '',
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  });
};

const client = (): HitobitoClient =>
  new HitobitoClient({ baseUrl: BASE_URL, apiToken: 'token', browserCookie: 'session' });

describe('Cevi.DB request metrics', () => {
  it('records an API request under its route template, never its ids', async () => {
    answerWith(200, '{"data":[]}');

    await client().apiRequest('GET', '/api/people/4242');

    expect(samples).toEqual([
      {
        name: 'cevidb_request_duration_seconds',
        value: expect.any(Number) as number,
        attributes: { channel: 'api', method: 'GET', route: '/api/people/:id', outcome: 'ok' },
      },
    ]);
  });

  it('names the reason Cevi.DB refused a request', async () => {
    answerWith(403, 'forbidden');

    await expect(client().apiRequest('GET', '/api/people/4242')).rejects.toThrow('403');

    expect(samples.map((sample) => sample.attributes['outcome'])).toEqual(['forbidden']);
  });

  it('tells a timeout apart from a refused connection', async () => {
    const abort = new Error('This operation was aborted');
    abort.name = 'AbortError';
    globalThis.fetch = jest.fn().mockRejectedValueOnce(abort);
    await expect(client().apiRequest('GET', '/api/groups')).rejects.toThrow('aborted');

    globalThis.fetch = jest.fn().mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(client().apiRequest('GET', '/api/groups')).rejects.toThrow('fetch failed');

    expect(samples.map((sample) => sample.attributes['outcome'])).toEqual(['timeout', 'network']);
  });

  it('records a dead browser session, which Cevi.DB answers with a 200', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        statusText: '',
        url: '',
        headers: new Headers({ location: `${BASE_URL}/users/sign_in` }),
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: '',
        url: `${BASE_URL}/users/sign_in`,
        headers: new Headers(),
        text: () => Promise.resolve('<form>'),
      });

    await expect(client().frontendRequest('GET', '/groups/4105/people')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(samples.map((sample) => sample.attributes)).toEqual([
      {
        channel: 'frontend',
        method: 'GET',
        route: '/groups/:id/people',
        outcome: 'session_expired',
      },
    ]);
  });
});
