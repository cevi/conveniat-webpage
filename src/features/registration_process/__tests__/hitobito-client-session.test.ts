import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { SessionExpiredError } from '@/features/registration_process/hitobito-api/errors';

const BASE_URL = 'https://db.cevi.ch';
const EDIT_PATH = '/groups/4540/events/5430/participations/110111/edit';

/**
 * What `fetch` hands back after it has followed Hitobito's redirect: a `200` whose body is
 * the login form and whose `url` is the sign-in page.
 */
const signInPage = (): Response =>
  ({
    ok: true,
    status: 200,
    url: `${BASE_URL}/users/sign_in`,
    text: () => Promise.resolve('<html><title>cevi.db - Anmelden</title></html>'),
  }) as unknown as Response;

const page = (url: string, body: string): Response =>
  ({ ok: true, status: 200, url, text: () => Promise.resolve(body) }) as unknown as Response;

const clientWith = (response: Response): HitobitoClient => {
  globalThis.fetch = jest.fn().mockResolvedValue(response);
  return new HitobitoClient({ baseUrl: BASE_URL, apiToken: 'token', browserCookie: 'stale' });
};

describe('HitobitoClient.frontendRequest', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reports an expired session rather than handing the login page to the caller', async () => {
    const client = clientWith(signInPage());

    await expect(client.frontendRequest('GET', EDIT_PATH)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('names the page that was asked for, so the log says which read was lost', async () => {
    const client = clientWith(signInPage());

    await expect(client.frontendRequest('GET', EDIT_PATH)).rejects.toThrow(EDIT_PATH);
  });

  it('passes a page through that was actually served', async () => {
    const client = clientWith(page(`${BASE_URL}${EDIT_PATH}`, '<form></form>'));

    const { body } = await client.frontendRequest('GET', EDIT_PATH);

    expect(body).toBe('<form></form>');
  });

  it('leaves a request for the sign-in page itself alone', async () => {
    const client = clientWith(signInPage());

    const { response } = await client.frontendRequest('GET', '/users/sign_in');

    expect(response.status).toBe(200);
  });
});
