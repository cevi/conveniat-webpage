// built inside the factory: `jest.mock` runs before this file's own constants exist, and the
// client creates its logger as soon as it is imported
jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn() };
  return { createLogger: (): typeof logger => logger };
});

import { FatalError, HitobitoClient } from '@/lib/hitobito/client';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { ServerLogger } from '@/utils/server-logger';

const { createLogger } = jest.requireMock<{
  createLogger: () => jest.Mocked<Pick<ServerLogger, 'debug' | 'info'>>;
}>('@/utils/server-logger');
const requestLog = createLogger();

const BASE_URL = 'https://db.cevi.ch';
const EDIT_PATH = '/groups/4540/events/5430/participations/110111/edit';

/** A response as `fetch` hands it back with `redirect: 'manual'`. */
const respond = (
  url: string,
  status: number,
  body = '',
  headers: Record<string, string> = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    url,
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  }) as unknown as Response;

const redirect = (from: string, to: string, status = 302): Response =>
  respond(from, status, '', { location: to });

/** A `fetch` answering each request with the next of the given responses, in order. */
const fetchAnswering = (...responses: Response[]): jest.Mock => {
  const fetchMock = jest.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  globalThis.fetch = fetchMock;
  return fetchMock;
};

const client = (): HitobitoClient =>
  new HitobitoClient({ baseUrl: BASE_URL, apiToken: 'token', browserCookie: 'session' });

/** The URL and headers of every request that went out. */
const requestsOf = (fetchMock: jest.Mock): { url: string; headers: Headers }[] =>
  fetchMock.mock.calls.map(([url, init]: [string, RequestInit]) => ({
    url,
    headers: new Headers(init.headers),
  }));

describe('HitobitoClient.frontendRequest', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reports an expired session rather than handing the login page to the caller', async () => {
    fetchAnswering(
      redirect(`${BASE_URL}${EDIT_PATH}`, '/users/sign_in'),
      respond(`${BASE_URL}/users/sign_in`, 200, '<title>cevi.db - Anmelden</title>'),
    );

    await expect(client().frontendRequest('GET', EDIT_PATH)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('names the page that was asked for, so the log says which read was lost', async () => {
    fetchAnswering(
      redirect(`${BASE_URL}${EDIT_PATH}`, `${BASE_URL}/users/sign_in`),
      respond(`${BASE_URL}/users/sign_in`, 200),
    );

    await expect(client().frontendRequest('GET', EDIT_PATH)).rejects.toThrow(EDIT_PATH);
  });

  it('passes a page through that was actually served', async () => {
    fetchAnswering(respond(`${BASE_URL}${EDIT_PATH}`, 200, '<form></form>'));

    const { body } = await client().frontendRequest('GET', EDIT_PATH);

    expect(body).toBe('<form></form>');
  });

  it('leaves a request for the sign-in page itself alone', async () => {
    fetchAnswering(respond(`${BASE_URL}/users/sign_in`, 200));

    const { response } = await client().frontendRequest('GET', '/users/sign_in');

    expect(response.status).toBe(200);
  });

  it('follows a form post to the page it created, as a GET with the session', async () => {
    const created = `${BASE_URL}/groups/4540/events/5430/participations/120000`;
    const fetchMock = fetchAnswering(
      redirect(`${BASE_URL}/groups/4540/events/5430/participations`, created),
      respond(created, 200, 'ok'),
    );

    const { finalUrl } = await client().frontendRequest(
      'POST',
      '/groups/4540/events/5430/participations',
      { body: 'a=1' },
    );

    expect(finalUrl).toBe(created);
    const [, second] = fetchMock.mock.calls as [unknown, [string, RequestInit]];
    expect(second[1].method).toBe('GET');
    expect(second[1].body).toBeNull();
    expect(new Headers(second[1].headers).get('Cookie')).toBe('session');
  });

  it('never sends the session or the token to another origin a redirect points to', async () => {
    const fetchMock = fetchAnswering(
      redirect(`${BASE_URL}/groups/1/people.json`, 'https://elsewhere.example/steal'),
    );

    await expect(
      client().frontendRequest('GET', '/groups/1/people.json', {
        headers: { 'X-Token': 'token' },
      }),
    ).rejects.toBeInstanceOf(FatalError);
    expect(requestsOf(fetchMock).map(({ url }) => url)).toEqual([
      `${BASE_URL}/groups/1/people.json`,
    ]);
  });

  it('refuses an absolute URL on another origin before sending anything, and logs it', async () => {
    const fetchMock = fetchAnswering();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const logged = new HitobitoClient(
      { baseUrl: BASE_URL, apiToken: 'token', browserCookie: 'session' },
      logger,
    );

    await expect(
      logged.frontendRequest('GET', 'https://elsewhere.example/groups/1/people.json'),
    ).rejects.toBeInstanceOf(FatalError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('elsewhere.example'));
  });
});

describe('HitobitoClient.apiRequest', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('logs each request once at debug, with its path but not its query', async () => {
    fetchAnswering(respond(`${BASE_URL}/api/people`, 200, '{"data":[]}'));
    requestLog.debug.mockClear();

    await client().apiRequest('GET', '/api/people', {
      params: { 'filter[email][eq]': 'hans.muster@example.com' },
    });

    // a Hof sync sends hundreds of these; at info they buried everything else in Loki
    expect(requestLog.info).not.toHaveBeenCalled();
    expect(requestLog.debug).toHaveBeenCalledTimes(1);
    const [message, attributes] = requestLog.debug.mock.calls[0] ?? [];
    expect(message).toBe('Cevi.DB API request');
    expect(attributes).toMatchObject({
      'http.request.method': 'GET',
      'url.path': '/api/people',
      'http.response.status_code': 200,
    });
    expect(attributes?.['hitobito.duration_ms']).toEqual(expect.any(Number));
    expect(JSON.stringify(attributes)).not.toContain('hans.muster');
  });

  it('follows a pagination link on the same origin with the token', async () => {
    const fetchMock = fetchAnswering(respond(`${BASE_URL}/api/groups?page=2`, 200, '{"data":[]}'));

    await client().apiRequest('GET', `${BASE_URL}/api/groups?page=2`);

    expect(requestsOf(fetchMock)[0]?.headers.get('X-TOKEN')).toBe('token');
  });

  it('refuses a pagination link on another origin instead of sending the token there', async () => {
    const fetchMock = fetchAnswering();

    await expect(
      client().apiRequest('GET', 'https://elsewhere.example/api/groups?page=2'),
    ).rejects.toBeInstanceOf(FatalError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a redirect as an error instead of following it with the token', async () => {
    const fetchMock = fetchAnswering(
      redirect(`${BASE_URL}/api/groups`, 'https://elsewhere.example/api/groups'),
    );

    await expect(client().apiRequest('GET', '/api/groups')).rejects.toThrow('302');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].redirect).toBe('manual');
  });
});
