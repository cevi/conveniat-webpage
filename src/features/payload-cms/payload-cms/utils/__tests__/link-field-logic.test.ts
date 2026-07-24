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

  it('should ignore empty fragment string', () => {
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
  });
});
