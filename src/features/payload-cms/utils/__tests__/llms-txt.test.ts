import type { LlmsSourceDocument } from '@/features/payload-cms/utils/llms-txt';
import { renderLlmsTxt, toLlmsLinks } from '@/features/payload-cms/utils/llms-txt';
import type { Locale } from '@/types/types';

const PUBLIC_PERMISSION = {
  id: 'permission-public',
  special_permissions: { public: true, logged_in: false },
};
const LOGGED_IN_PERMISSION = {
  id: 'permission-logged-in',
  special_permissions: { public: false, logged_in: true },
};
const GROUP_PERMISSION = {
  id: 'permission-group',
  permissions: [{ group_id: 1234, note: '' }],
  special_permissions: { public: false, logged_in: false },
};

const buildPage = (
  slug: string,
  published: Locale[],
  permissions: unknown = PUBLIC_PERMISSION,
): LlmsSourceDocument =>
  ({
    _localized_status: {
      de: { published: published.includes('de') },
      fr: { published: published.includes('fr') },
      en: { published: published.includes('en') },
    },
    content: {
      pageTitle: { de: `Titel ${slug}`, fr: `Titre ${slug}`, en: `Title ${slug}` },
      permissions,
    },
    seo: {
      urlSlug: { de: slug, fr: `${slug}-fr`, en: `${slug}-en` },
      metaDescription: { de: `Beschreibung ${slug}`, fr: `Description ${slug}` },
    },
  }) as LlmsSourceDocument;

const options = {
  hostUrl: 'https://conveniat27.ch',
  locales: ['de', 'fr', 'en'] as Locale[],
  defaultLocale: 'de' as Locale,
};

describe('toLlmsLinks', () => {
  it('lists a published public page with its title and description', () => {
    expect(toLlmsLinks([buildPage('anmeldung', ['de'])], options)).toEqual([
      {
        title: 'Titel anmeldung',
        url: 'https://conveniat27.ch/anmeldung',
        description: 'Beschreibung anmeldung',
      },
    ]);
  });

  it('leaves out a page that is not published in any locale', () => {
    expect(toLlmsLinks([buildPage('entwurf', [])], options)).toEqual([]);
  });

  it('leaves out pages that need a login or a Cevi.DB group', () => {
    const pages = [
      buildPage('nur-eingeloggt', ['de'], LOGGED_IN_PERMISSION),
      buildPage('nur-kernteam', ['de'], GROUP_PERMISSION),
      // the permission could not be populated, so nobody knows who may read the page
      buildPage('unbekannt', ['de'], 'permission-id'),
    ];
    expect(toLlmsLinks(pages, options)).toEqual([]);
  });

  it('lists a page without a permission, which every visitor can open', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(toLlmsLinks([buildPage('offen', ['de'], null)], options)).toHaveLength(1);
  });

  it('links the first locale a page is published in', () => {
    expect(toLlmsLinks([buildPage('voyage', ['fr', 'en'])], options)).toEqual([
      {
        title: 'Titre voyage',
        url: 'https://conveniat27.ch/fr/voyage-fr',
        description: 'Description voyage',
      },
    ]);
  });

  it('ignores a locale the deployment does not serve', () => {
    const konekta = { ...options, locales: ['de', 'fr'] as Locale[] };
    expect(toLlmsLinks([buildPage('travel', ['en'])], konekta)).toEqual([]);
  });

  it('links the landing page, which has an empty slug, first', () => {
    const links = toLlmsLinks([buildPage('anmeldung', ['de']), buildPage('', ['de'])], options);
    expect(links.map((link) => link.url)).toEqual([
      'https://conveniat27.ch',
      'https://conveniat27.ch/anmeldung',
    ]);
  });

  it('skips a draft that never got a title or a slug', () => {
    const draft = { _localized_status: { de: { published: true } } } as LlmsSourceDocument;
    expect(toLlmsLinks([draft], options)).toEqual([]);
  });
});

describe('renderLlmsTxt', () => {
  it('renders the title, the summary and one section per group of links', () => {
    const text = renderLlmsTxt({
      title: 'conveniat27 - MIR SIND CEVI',
      description: 'Das Lager\ndes Cevi.',
      sections: [
        {
          heading: 'Seiten',
          links: [
            {
              title: 'Anmeldung',
              url: 'https://conveniat27.ch/anmeldung',
              description: 'So\ngeht es.',
            },
            { title: 'Kontakt [neu]', url: 'https://conveniat27.ch/kontakt' },
          ],
        },
        { heading: 'Formulare', links: [] },
      ],
    });

    expect(text).toBe(
      [
        '# conveniat27 - MIR SIND CEVI',
        '',
        '> Das Lager des Cevi.',
        '',
        '## Seiten',
        '',
        '- [Anmeldung](https://conveniat27.ch/anmeldung): So geht es.',
        '- [Kontakt (neu)](https://conveniat27.ch/kontakt)',
        '',
      ].join('\n'),
    );
  });
});
