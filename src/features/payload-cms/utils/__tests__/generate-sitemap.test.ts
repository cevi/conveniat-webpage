import { cachedSitemapGenerator } from '@/features/payload-cms/utils/generate-sitemap';
import type { Locale } from '@/types/types';

const find = jest.fn();

jest.mock('payload', () => ({ getPayload: (): unknown => ({ find }) }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('next/cache', () => ({ cacheLife: jest.fn(), cacheTag: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://conveniat27.ch' },
}));
jest.mock('@/features/payload-cms/special-pages-table', () => ({
  specialPagesTable: {},
  specialPagePathsByLocale: (): Record<string, string> => ({}),
}));

const PUBLIC_PERMISSION = 'permission-public';

/** A page as the sitemap reads it: in every locale, and without its `publishingStatus`. */
const buildPage = (
  slug: string,
  published: Locale[],
  permissions: string | undefined = PUBLIC_PERMISSION,
): unknown => ({
  id: slug,
  updatedAt: '2026-11-20T10:00:00.000Z',
  _localized_status: Object.fromEntries(
    (['de', 'fr', 'en'] as Locale[]).map((locale) => [
      locale,
      { published: published.includes(locale) },
    ]),
  ),
  content: { permissions },
  seo: { urlSlug: { de: slug, fr: `${slug}-fr`, en: `${slug}-en` } },
});

const sitemapOf = async (pages: unknown[]): Promise<string[]> => {
  find.mockImplementation(({ collection }: { collection: string }) =>
    Promise.resolve({ docs: collection === 'permissions' ? [{ id: PUBLIC_PERMISSION }] : pages }),
  );
  const sitemap = await cachedSitemapGenerator();
  return sitemap.map((entry) => entry.url);
};

describe('cachedSitemapGenerator', () => {
  it('lists a page in every locale it is published in', async () => {
    expect(await sitemapOf([buildPage('anmeldung', ['de', 'fr'])])).toEqual([
      'https://conveniat27.ch/anmeldung',
      'https://conveniat27.ch/fr/anmeldung-fr',
    ]);
  });

  it('names the other published versions of a page as its alternates', async () => {
    find.mockImplementation(({ collection }: { collection: string }) =>
      Promise.resolve({
        docs:
          collection === 'permissions'
            ? [{ id: PUBLIC_PERMISSION }]
            : [buildPage('anmeldung', ['de', 'fr'])],
      }),
    );

    const [german] = await cachedSitemapGenerator();

    expect(german?.alternates?.languages).toMatchObject({
      de: 'https://conveniat27.ch/anmeldung',
      fr: 'https://conveniat27.ch/fr/anmeldung-fr',
    });
    expect(german?.alternates?.languages).not.toHaveProperty('en');
    expect(german?.lastModified).toBe('2026-11-20T10:00:00.000Z');
  });

  it('leaves out a page that is not published in any locale', async () => {
    expect(await sitemapOf([buildPage('entwurf', [])])).toEqual([]);
  });

  it('leaves out a locale the page was never saved in', async () => {
    const page = buildPage('nur-deutsch', ['de']) as { _localized_status: Record<string, unknown> };
    delete page._localized_status['fr'];
    delete page._localized_status['en'];

    expect(await sitemapOf([page])).toEqual(['https://conveniat27.ch/nur-deutsch']);
  });

  it('leaves out a page that is not public', async () => {
    expect(await sitemapOf([buildPage('intern', ['de'], 'permission-logged-in')])).toEqual([]);
  });

  it('lists a page without a permission', async () => {
    expect(await sitemapOf([{ ...(buildPage('offen', ['de']) as object), content: {} }])).toEqual([
      'https://conveniat27.ch/offen',
    ]);
  });
});
