import { toPermittedSearchResults } from '@/features/payload-cms/components/search/search-results';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { PaginatedDocs } from 'payload';

// An anonymous visitor: no session.
jest.mock('@/utils/auth', () => ({
  getCachedSession: jest.fn(() => Promise.resolve()),
}));

// The lexical plaintext export is ESM only; the rich text body of these fixtures is a plain string.
jest.mock('@payloadcms/richtext-lexical/plaintext', () => ({
  convertLexicalToPlaintext: ({ data }: { data: unknown }): string => String(data),
}));

const buildPage = (
  id: string,
  title: string,
  permissions: { public: boolean; groupId?: number },
): GenericPage =>
  ({
    id,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    seo: { urlSlug: `slug-${id}`, metaDescription: `meta description of ${title}` },
    content: {
      pageTitle: title,
      releaseDate: '2026-05-01T08:00:00.000Z',
      permissions: {
        id: `permission-${id}`,
        permissionName: `permission of ${title}`,
        special_permissions: { public: permissions.public, logged_in: false },
        permissions:
          permissions.groupId === undefined ? [] : [{ group_id: permissions.groupId, note: '' }],
        updatedAt: '2026-05-01T08:00:00.000Z',
        createdAt: '2026-05-01T08:00:00.000Z',
      },
      mainContent: [{ blockType: 'richTextSection', richTextSection: `body of ${title}` }],
    },
  }) as unknown as GenericPage;

const paginate = (documents: GenericPage[]): PaginatedDocs<GenericPage> => ({
  docs: documents,
  totalDocs: 7,
  limit: 3,
  totalPages: 3,
  page: 2,
  pagingCounter: 4,
  hasPrevPage: true,
  hasNextPage: true,
  prevPage: 1,
  nextPage: 3,
});

describe('toPermittedSearchResults', () => {
  it('sends nothing of a page the visitor may not see', async () => {
    const results = await toPermittedSearchResults(
      paginate([
        buildPage('open', 'Open Page', { public: true }),
        buildPage('closed', 'Leitungsteam Internals', { public: false, groupId: 42 }),
      ]),
      (document) => document.content.pageTitle,
    );

    const sentToBrowser = JSON.stringify(results);
    expect(sentToBrowser).not.toContain('closed');
    expect(sentToBrowser).not.toContain('Leitungsteam Internals');
    expect(results.results.map((result) => result.title)).toEqual(['Open Page']);
  });

  it('sends only the fields a result card renders', async () => {
    const results = await toPermittedSearchResults(
      paginate([buildPage('open', 'Open Page', { public: true })]),
      (document) => document.content.pageTitle,
    );

    expect(results).toEqual({
      results: [
        {
          id: 'open',
          url: '/slug-open',
          title: 'Open Page',
          createdAt: '2026-05-01T08:00:00.000Z',
          excerpt: 'body of Open Page',
        },
      ],
      pagination: { totalPages: 3, hasPrevPage: true, hasNextPage: true, prevPage: 1, nextPage: 3 },
    });
    expect(JSON.stringify(results)).not.toContain('meta description');
  });
});
