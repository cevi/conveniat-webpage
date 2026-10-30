import type { PublishedPageSlugs } from '@/features/payload-cms/api/published-page-slugs';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// the route tables are read for their paths, never rendered
jest.mock('@/features/payload-cms/page-layouts/search-page', () => ({
  default: (): undefined => undefined,
}));
jest.mock('@/features/payload-cms/page-layouts/forms-preview-page', () => ({
  FormsPreviewPage: (): undefined => undefined,
}));

const mockFetchPublishedPageSlugs = jest.fn<Promise<PublishedPageSlugs>, []>();
jest.mock('@/features/payload-cms/api/published-page-slugs', () => ({
  fetchPublishedPageSlugs: (): Promise<PublishedPageSlugs> => mockFetchPublishedPageSlugs(),
}));

type NotFoundProxyModule = typeof import('@/proxy/not-found-proxy');

const published = (genericPages: string[], blogPosts: string[] = []): PublishedPageSlugs => ({
  genericPages: new Set(genericPages),
  blogPosts: new Set(blogPosts),
});

/** Loads the module fresh, so every test starts without slugs in memory. */
const loadModule = (): NotFoundProxyModule => {
  let loaded: NotFoundProxyModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<NotFoundProxyModule>('@/proxy/not-found-proxy');
  });
  if (loaded === undefined) throw new Error('module did not load');
  return loaded;
};

/** Runs the proxy on a request the design rewrite already sent to `rewrittenPath`. */
const run = async (
  proxyModule: NotFoundProxyModule,
  url: string,
  rewrittenPath: string,
  method = 'GET',
): Promise<string | undefined> => {
  const request = new NextRequest(new URL(url, 'https://conveniat27.ch'), { method });
  const response = NextResponse.next();
  response.headers.set('x-middleware-rewrite', new URL(rewrittenPath, request.url).toString());

  const result = await proxyModule.notFoundProxy((_request, _event, final) => final)(
    request,
    {} as NextFetchEvent,
    response,
  );
  const rewrite = result.headers.get('x-middleware-rewrite');
  return rewrite === null ? undefined : new URL(rewrite).pathname;
};

describe('notFoundProxy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchPublishedPageSlugs.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rewrites a path without a published page to the 404 route of its locale and design', async () => {
    mockFetchPublishedPageSlugs.mockResolvedValue(published(['', 'anmeldung']));
    const proxyModule = loadModule();

    await expect(
      run(proxyModule, '/fr/does-not-exist', '/fr/design-mode-app/does-not-exist'),
    ).resolves.toBe('/fr/design-mode-app/~not-found');
  });

  it('leaves published pages, their old slugs and blog posts to the page route', async () => {
    const slugs = published(['', 'über-uns', 'lager/anmeldung'], ['erster-beitrag']);
    mockFetchPublishedPageSlugs.mockResolvedValue(slugs);
    const proxyModule = loadModule();

    for (const page of ['/', '/%C3%BCber-uns', '/lager/anmeldung', '/blog/erster-beitrag']) {
      await expect(run(proxyModule, page, `/de/design-mode-web${page}`)).resolves.toBe(
        `/de/design-mode-web${page}`,
      );
    }
    await expect(
      run(proxyModule, '/blog/anmeldung', '/de/design-mode-web/blog/anmeldung'),
    ).resolves.toBe('/de/design-mode-web/~not-found');
  });

  it('leaves routes of their own, previews and form posts alone', async () => {
    mockFetchPublishedPageSlugs.mockResolvedValue(published(['']));
    const proxyModule = loadModule();

    for (const page of ['/app/dashboard', '/suche', '/go/abc', '/timeline-preview/123']) {
      await expect(run(proxyModule, page, `/de/design-mode-web${page}`)).resolves.toBe(
        `/de/design-mode-web${page}`,
      );
    }
    await expect(
      run(proxyModule, '/draft?preview=true', '/de/design-mode-web/draft'),
    ).resolves.toBe('/de/design-mode-web/draft');
    await expect(run(proxyModule, '/draft', '/de/design-mode-web/draft', 'POST')).resolves.toBe(
      '/de/design-mode-web/draft',
    );
  });

  it('finds a page published after the slugs were read', async () => {
    mockFetchPublishedPageSlugs.mockResolvedValueOnce(published(['']));
    const proxyModule = loadModule();
    await expect(run(proxyModule, '/neu', '/de/design-mode-web/neu')).resolves.toBe(
      '/de/design-mode-web/~not-found',
    );

    mockFetchPublishedPageSlugs.mockResolvedValue(published(['', 'neu']));
    await expect(run(proxyModule, '/neu', '/de/design-mode-web/neu')).resolves.toBe(
      '/de/design-mode-web/~not-found',
    );
    expect(mockFetchPublishedPageSlugs).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10_000);
    await expect(run(proxyModule, '/neu', '/de/design-mode-web/neu')).resolves.toBe(
      '/de/design-mode-web/neu',
    );
  });

  it('leaves every path to the page route while the slugs cannot be read', async () => {
    mockFetchPublishedPageSlugs.mockRejectedValue(new Error('mongo is down'));
    const proxyModule = loadModule();

    await expect(
      run(proxyModule, '/does-not-exist', '/de/design-mode-web/does-not-exist'),
    ).resolves.toBe('/de/design-mode-web/does-not-exist');
  });
});

describe('SEGMENTS_NOT_RESOLVED_BY_SLUG', () => {
  const { SEGMENTS_NOT_RESOLVED_BY_SLUG } = loadModule();

  /** The first path segments the folders below `[locale]/[design]` serve, route groups opened. */
  const routeSegments = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
      .flatMap((entry) =>
        entry.name.startsWith('(') ? routeSegments(path.join(directory, entry.name)) : [entry.name],
      );

  it('names every route below the locale and the design', () => {
    const routes = routeSegments(path.join(process.cwd(), 'src/app/(frontend)/[locale]/[design]'));

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(SEGMENTS_NOT_RESOLVED_BY_SLUG).toContain(route);
  });

  it('names every special page', () => {
    const paths = Object.values(specialPagesTable).flatMap(({ alternatives }) =>
      Object.values(alternatives).map((alternative) => alternative.replace(/^\//, '')),
    );

    for (const special of paths) expect(SEGMENTS_NOT_RESOLVED_BY_SLUG).toContain(special);
  });

  it('names every collection prefix except the ones the proxy checks', () => {
    const prefixes = slugToUrlMapping
      .filter(({ slug }) => slug !== 'blog' && slug !== 'generic-page')
      .flatMap(({ urlPrefix }) => Object.values(urlPrefix));

    for (const prefix of prefixes) expect(SEGMENTS_NOT_RESOLVED_BY_SLUG).toContain(prefix);
  });
});
