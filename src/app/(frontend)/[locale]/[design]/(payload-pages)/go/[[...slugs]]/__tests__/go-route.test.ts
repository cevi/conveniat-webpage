import { GET } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/go/[[...slugs]]/route';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('@/features/payload-cms/route-resolution-table', () => ({
  findPrefixByCollectionSlugAndLocale: jest.fn(() => 'infos'),
}));

/**
 * A short link is printed on paper and opened by whatever the reader has, which is not
 * always a browser. What has to hold is the response itself: a redirect status and a
 * Location, never a page that only a client runtime knows how to follow.
 */
describe('/go/[[...slugs]] route', () => {
  const mockPayload = { find: jest.fn() };

  const request = new Request('http://localhost:3000/go/agbs');
  const callGet = async (slugs?: string[]): Promise<Response> =>
    GET(request, { params: Promise.resolve({ slugs }) });

  /** What `payload.find` answers for a slug that no `go` entry matches. */
  const noMatch = { docs: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    mockPayload.find.mockResolvedValue(noMatch);
  });

  it('sends the app shortcut on without asking the CMS', async () => {
    const response = await callGet(['app', 'dashboard']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/app/dashboard');
    expect(mockPayload.find).not.toHaveBeenCalled();
  });

  it('resolves a custom target to the address the editor entered', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ urlSlug: 'agbs', to: { type: 'custom', url: 'https://example.org/agbs' } }],
    });

    const response = await callGet(['agbs']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.org/agbs');
  });

  it('resolves a reference to the page in the locale the entry was written in', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [
        {
          urlSlug: 'agbs',
          to: {
            type: 'reference',
            reference: {
              relationTo: 'generic-page',
              value: { _locale: 'fr', seo: { urlSlug: 'conditions' } },
            },
          },
        },
      ],
    });

    const response = await callGet(['agbs']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/fr/infos/conditions');
  });

  it('sends a slug that names nothing to the start page', async () => {
    const response = await callGet(['weder-noch']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/');
  });

  it('sends a bare /go to the start page', async () => {
    const response = await callGet();

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/');
  });
});
