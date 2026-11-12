import { NextRequest } from 'next/server';

const payloadGet = jest.fn<Promise<Response>, [Request, unknown]>();
const auth = jest.fn<Promise<unknown>, []>();

jest.mock('@payload-config', () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock('@payloadcms/next/routes', () => ({
  REST_GET: (): typeof payloadGet => payloadGet,
  REST_POST: jest.fn(),
  REST_DELETE: jest.fn(),
  REST_PATCH: jest.fn(),
  REST_OPTIONS: jest.fn(),
}));
jest.mock('@/utils/auth', () => ({ auth: (): Promise<unknown> => auth() }));

const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,*/*;q=0.8';
const FORBIDDEN_JSON = JSON.stringify({ errors: [{ message: 'forbidden' }] });

const openAsBrowser = async (path: string, accept: string): Promise<Response> => {
  const { GET } = await import('@/app/(payload)/api/[...slug]/route');
  const request = new NextRequest(`https://conveniat27.ch${path}`, { headers: { accept } });
  return GET(request, { params: Promise.resolve({ slug: [] }) });
};

describe('GET /api/[...slug]', () => {
  beforeEach(() => {
    payloadGet.mockReset().mockResolvedValue(new Response(FORBIDDEN_JSON, { status: 403 }));
    auth.mockReset().mockResolvedValue(null);
  });

  it('sends a signed-out browser to the login and back to the file', async () => {
    const response = await openAsBrowser('/api/chat-images/abc', BROWSER_ACCEPT);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login?callbackUrl=%2Fapi%2Fchat-images%2Fabc');
  });

  it('carries a path with quotes and brackets only as an encoded parameter', async () => {
    const response = await openAsBrowser(
      "/api/chat-images/'-alert(document.domain)-'<b>",
      BROWSER_ACCEPT,
    );

    const location = response.headers.get('location') ?? '';
    expect(location).not.toMatch(/['<>]/);
    expect(new URL(location, 'https://conveniat27.ch').searchParams.get('callbackUrl')).toBe(
      new URL("https://conveniat27.ch/api/chat-images/'-alert(document.domain)-'<b>").pathname,
    );
  });

  it("keeps Payload's 403 for a signed-in visitor, whom a login would not help", async () => {
    auth.mockResolvedValue({ user: { uuid: 'someone' } });

    const response = await openAsBrowser('/api/chat-images/abc', BROWSER_ACCEPT);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe(FORBIDDEN_JSON);
  });

  it("keeps Payload's 403 for a request that does not ask for HTML", async () => {
    const response = await openAsBrowser('/api/chat-images/abc', 'application/json');

    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });

  it('passes every other status through', async () => {
    payloadGet.mockResolvedValue(new Response('{}', { status: 200 }));

    const response = await openAsBrowser('/api/chat-images/abc', BROWSER_ACCEPT);

    expect(response.status).toBe(200);
  });
});
