import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { GenericPage } from '@/features/payload-cms/payload-types';

describe('getURLForLinkField', () => {
  const mockGenericPage = {
    id: 'page-1',
    title: 'Ressort',
    seo: {
      urlSlug: 'ressort',
    },
    updatedAt: '2025-01-01',
    createdAt: '2025-01-01',
  } as unknown as GenericPage;

  it('should return internal page URL without fragment when fragment is not provided', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort');
  });

  it('should append fragment to internal page URL when fragment is provided without hash', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: 'projektleitung',
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort#projektleitung');
  });

  it('should append fragment to internal page URL when fragment is provided with hash prefix', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: '#projektleitung',
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort#projektleitung');
  });

  it('should support non-default locale language prefix with fragment', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: 'projektleitung',
    };

    const url = getURLForLinkField(linkField, 'en');
    expect(url).toBe('/en/ressort#projektleitung');
  });

  it('should trim whitespace around fragment', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: '  projektleitung  ',
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort#projektleitung');
  });

  it('should ignore empty fragment string or single hash', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: '   ',
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort');

    const hashOnlyLinkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: ' # ',
    };

    const hashOnlyUrl = getURLForLinkField(hashOnlyLinkField, 'de');
    expect(hashOnlyUrl).toBe('/ressort');
  });

  it('should percent-encode special characters and spaces in fragment', () => {
    const linkField: LinkFieldDataType = {
      type: 'reference',
      reference: {
        relationTo: 'generic-page',
        value: mockGenericPage,
      },
      fragment: 'projekt leitung & team',
    };

    const url = getURLForLinkField(linkField, 'de');
    expect(url).toBe('/ressort#projekt%20leitung%20%26%20team');
  });

  describe('custom URLs', () => {
    it('should return a custom URL the router can resolve', () => {
      const linkField: LinkFieldDataType = {
        type: 'custom',
        url: 'https://donate.raisenow.io/cprdt',
      };

      expect(getURLForLinkField(linkField, 'de')).toBe('https://donate.raisenow.io/cprdt');
    });

    it.each([['https://'], ['http://'], ['//'], ['']])(
      'should drop the half-typed custom URL %p rather than render a dead link',
      (url) => {
        // Payload does not validate draft fields, so an editor who saves
        // mid-typing and hits preview gets this far.
        // See https://github.com/cevi/conveniat-webpage/issues/1670
        const linkField: LinkFieldDataType = { type: 'custom', url };

        expect(getURLForLinkField(linkField, 'de')).toBeUndefined();
      },
    );

    it('should drop a custom link with no URL at all', () => {
      const linkField: LinkFieldDataType = { type: 'custom' };

      expect(getURLForLinkField(linkField, 'de')).toBeUndefined();
    });
  });
});
