import { processMenuTree } from '@/components/menu/main-menu';
import type { Header } from '@/features/payload-cms/payload-types';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/features/payload-cms/api/cached-globals', () => ({ getHeaderCached: jest.fn() }));

// The menu's rendering half pulls in server-only and client-only modules this test does
// not exercise.
jest.mock('@/components/footer/footer-copyright-area', () => ({}));
jest.mock('@/components/menu/main-menu-language-switcher', () => ({}));
jest.mock('@/components/menu/preview-menu-switcher', () => ({}));
jest.mock('@/components/menu/search', () => ({}));
jest.mock('@/components/native-app-version-info', () => ({}));
jest.mock('@/components/menu/app-features', () => ({}));
jest.mock('@/features/payload-cms/special-pages-table', () => ({}));
jest.mock('@/utils/is-admin-session', () => ({}));

/**
 * A menu entry as the header global returns it: the link target is the whole populated
 * page, including what an editor keeps internal.
 */
const pageLink = (urlSlug: string): unknown => ({
  type: 'reference',
  reference: {
    relationTo: 'generic-page',
    value: {
      id: `page-${urlSlug}`,
      _locale: 'fr',
      internalPageName: 'internal page name',
      seo: { urlSlug },
      content: {
        permissions: { id: 'public', special_permissions: { public: true } },
        mainContent: [{ blockType: 'formBlock', form: { emails: [{ emailTo: 'x@y.z' }] } }],
      },
    },
  },
});

const rawMenu = [
  {
    id: 'top',
    label: 'Programm',
    linkField: pageLink('programme'),
    subMenu: [{ id: 'sub', label: 'Ateliers', linkField: pageLink('ateliers') }],
  },
] as unknown as NonNullable<Header['mainMenu']>;

describe('processMenuTree', () => {
  it('hands the client the resolved link and none of the linked document', async () => {
    const [item] = await processMenuTree(rawMenu, 'fr', false);

    expect(item).toMatchObject({
      label: 'Programm',
      hasLink: true,
      isVisible: true,
      itemLink: '/fr/programme',
      subMenu: [{ label: 'Ateliers', hasLink: true, isVisible: true, itemLink: '/fr/ateliers' }],
    });

    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('internal page name');
    expect(serialized).not.toContain('x@y.z');
    expect(serialized).not.toContain('special_permissions');
  });
});
