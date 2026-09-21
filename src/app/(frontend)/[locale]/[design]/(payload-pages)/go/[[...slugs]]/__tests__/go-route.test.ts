import { GET } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/go/[[...slugs]]/route';
import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://conveniat27.ch' },
}));

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('@/features/payload-cms/route-resolution-table', () => ({
  findPrefixByCollectionSlugAndLocale: jest.fn(() => 'infos'),
}));

const callGet = async (slugs?: string[], from = 'https://conveniat27.ch'): Promise<Response> =>
  GET(new Request(`${from}/go`), { params: Promise.resolve({ slugs }) });

/** A `go` entry pointing at a page of this site, written in `locale`. */
const reference = (locale: string, urlSlug: string): unknown => ({
  docs: [
    {
      urlSlug: 'agbs',
      to: {
        type: 'reference',
        reference: { relationTo: 'generic-page', value: { _locale: locale, seo: { urlSlug } } },
      },
    },
  ],
});

/**
 * A short link is printed on paper and opened by whatever the reader has, which is not
 * always a browser. What has to hold is the response itself: a redirect status and a
 * Location, never a page that only a client runtime knows how to follow. And it has to
 * be one redirect — the Location names the site rather than the host the request arrived
 * on, and the canonical path rather than one the site would redirect again.
 */
describe('/go/[[...slugs]] route', () => {
  const mockPayload = { find: jest.fn() };

  /** What `payload.find` answers for a slug that no `go` entry matches. */
  const noMatch = { docs: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    (findPrefixByCollectionSlugAndLocale as jest.Mock).mockReturnValue('infos');
    mockPayload.find.mockResolvedValue(noMatch);
  });

  it('sends the app shortcut on without asking the CMS', async () => {
    const response = await callGet(['app', 'dashboard']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/app/dashboard');
    expect(mockPayload.find).not.toHaveBeenCalled();
  });

  it('resolves a custom target to the address the editor entered', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ urlSlug: 'agbs', to: { type: 'custom', url: 'https://example.org/agbs' } }],
    });

    const response = await callGet(['agbs']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://example.org/agbs');
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('resolves a reference to the page in the locale the entry was written in', async () => {
    mockPayload.find.mockResolvedValue(reference('fr', 'conditions'));

    const response = await callGet(['agbs']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/fr/infos/conditions');
    expect(response.headers.get('Set-Cookie')).toContain('next-locale=fr');
  });

  it('names the page the site actually serves for the prefix-less default locale', async () => {
    (findPrefixByCollectionSlugAndLocale as jest.Mock).mockReturnValue('');
    mockPayload.find.mockResolvedValue(reference('de', 'impressum'));

    const response = await callGet(['impressum']);

    // Not `/de//impressum`: the collection has no prefix, and `/de/…` would only be
    // redirected to the same path without it, which is the hop this avoids.
    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/impressum');
    expect(response.headers.get('Set-Cookie')).toContain('next-locale=de');
  });

  it('sends a slug that names nothing to the start page', async () => {
    const response = await callGet(['weder-noch']);

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/');
  });

  it('sends a bare /go to the start page', async () => {
    const response = await callGet();

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/');
  });

  it('leaves the short domain instead of resolving back onto it', async () => {
    mockPayload.find.mockResolvedValue(reference('fr', 'conditions'));

    const response = await callGet(['agbs'], 'https://con27.ch');

    expect(response.headers.get('Location')).toBe('https://conveniat27.ch/fr/infos/conditions');
  });
});
