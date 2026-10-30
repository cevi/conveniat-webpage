import { buildMetadata, findAlternatives } from '@/features/payload-cms/utils/metadata-helper';
import type { BasePayload } from 'payload';

const seo = { metaTitle: 'Über uns' };

describe('findAlternatives', () => {
  it('keys each version by the locale it was found in, not by a field of the document', async () => {
    // The query selects only `seo`, so the documents carry no `_locale`.
    const slugs: Record<string, string | undefined> = { de: 'lagerbericht', fr: 'rapport' };
    const find = jest.fn(({ locale }: { locale: string }) => {
      const slug = slugs[locale];
      return Promise.resolve({
        docs: slug === undefined ? [] : [{ id: 'a', seo: { urlSlug: slug } }],
      });
    });

    const slugsByLocale = await findAlternatives({
      payload: { find } as unknown as BasePayload,
      collection: 'blog',
      internalPageName: 'Lagerbericht',
      currentDate: '2027-07-24T00:00:00.000Z',
    });

    expect(slugsByLocale).toEqual({ de: 'lagerbericht', fr: 'rapport' });
  });
});

describe('buildMetadata', () => {
  it('makes every version its own canonical and lists all versions with German as x-default', () => {
    const slugsByLocale = { de: 'ueber-uns', fr: 'a-propos-de-nous', en: 'about-us' };

    expect(buildMetadata({ seo, locale: 'fr', slugsByLocale }).alternates).toEqual({
      canonical: '/fr/a-propos-de-nous',
      languages: {
        de: '/ueber-uns',
        fr: '/fr/a-propos-de-nous',
        en: '/en/about-us',
        'x-default': '/ueber-uns',
      },
    });
    expect(buildMetadata({ seo, locale: 'de', slugsByLocale }).alternates?.canonical).toBe(
      '/ueber-uns',
    );
  });

  it('links the German landing page, whose slug is empty, to the root', () => {
    const slugsByLocale = { de: '', fr: 'accueil', en: 'home' };

    expect(buildMetadata({ seo, locale: 'de', slugsByLocale }).alternates).toEqual({
      canonical: '/',
      languages: { de: '/', fr: '/fr/accueil', en: '/en/home', 'x-default': '/' },
    });
  });

  it('puts the collection prefix after the locale', () => {
    const slugsByLocale = { de: 'lagerbericht', fr: 'rapport' };

    expect(
      buildMetadata({ seo, locale: 'fr', slugsByLocale, urlPrefix: 'blog' }).alternates,
    ).toEqual({
      canonical: '/fr/blog/rapport',
      languages: {
        de: '/blog/lagerbericht',
        fr: '/fr/blog/rapport',
        'x-default': '/blog/lagerbericht',
      },
    });
  });

  it('leaves out x-default when the page has no German version', () => {
    const slugsByLocale = { fr: 'accueil', en: 'home' };

    expect(buildMetadata({ seo, locale: 'en', slugsByLocale }).alternates).toEqual({
      canonical: '/en/home',
      languages: { fr: '/fr/accueil', en: '/en/home' },
    });
  });
});
