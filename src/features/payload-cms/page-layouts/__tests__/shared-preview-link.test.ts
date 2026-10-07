// What a shared preview link may open, per page layout. `previewDocumentId` is the id the link
// was signed for; an editor previews without one.
jest.mock('server-only', () => ({}));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { JWT_SECRET: 'test-secret' },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { debug: () => void } => ({ debug: (): void => {} }),
}));
jest.mock('@/utils/tracing-helpers', () => ({
  withSpan: <T>(_name: string, run: () => Promise<T>): Promise<T> => run(),
}));
jest.mock('@/utils/has-permissions', () => ({ hasPermissions: (): boolean => true }));
jest.mock('@/utils/twitter-card-image', () => ({}));
jest.mock('@/features/payload-cms/utils/metadata-helper', () => ({}));
jest.mock('next/cache', () => ({ cacheLife: (): void => {}, cacheTag: (): void => {} }));

const NOT_FOUND = new Error('NEXT_NOT_FOUND');
jest.mock('next/navigation', () => ({
  notFound: (): never => {
    throw NOT_FOUND;
  },
  redirect: (): void => {},
  forbidden: (): void => {},
  unauthorized: (): void => {},
}));

// Rendering is not under test, only which document reaches it.
jest.mock('@/components/ui/link-component', () => ({}));
jest.mock('@/components/ui/typography/headline-h1', () => ({ HeadlineH1: 'h1' }));
jest.mock('@/features/payload-cms/components/content-blocks/show-form', () => ({
  ShowForm: 'show-form',
}));
jest.mock('@/features/payload-cms/components/content-blocks/timeline-entry', () => ({
  TimelineEntry: 'timeline-entry',
}));
jest.mock('@/features/payload-cms/converters/page-sections/section-error-boundary', () => ({}));
jest.mock('@/features/payload-cms/converters/generic-page', () => ({
  GenericPageConverter: 'generic-page-converter',
}));
jest.mock('@/features/payload-cms/converters/blog-article', () => ({
  BlogArticleConverter: 'blog-article-converter',
}));

const mockPageByID = jest.fn();
const mockPageBySlug = jest.fn();
jest.mock('@/features/payload-cms/api/cached-generic-pages', () => ({
  getGenericPageByIDCached: (...parameters: unknown[]): unknown => mockPageByID(...parameters),
  getGenericPageBySlugCached: (...parameters: unknown[]): unknown => mockPageBySlug(...parameters),
}));

const mockBlogBySlug = jest.fn();
jest.mock('@/features/payload-cms/api/cached-blogs', () => ({
  getBlogArticleBySlugCached: (...parameters: unknown[]): unknown => mockBlogBySlug(...parameters),
}));

const mockFind = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): Promise<{ find: jest.Mock }> => Promise.resolve({ find: mockFind }),
}));

import BlogPostPage from '@/features/payload-cms/page-layouts/blog-posts';
import { FormsPreviewPage } from '@/features/payload-cms/page-layouts/forms-preview-page';
import GenericPage from '@/features/payload-cms/page-layouts/generic-page';
import { TimelinePreviewPage } from '@/features/payload-cms/page-layouts/timeline-preview-page';
import type { LocalizedCollectionPage } from '@/types/types';
import type React from 'react';

const LINKED = '66f1a0c2b7e4d9a1c3e5f701';
const OTHER = '66f1a0c2b7e4d9a1c3e5f702';

const draft = (id: string): object => ({
  id,
  internalPageName: id,
  content: { permissions: undefined },
  seo: { urlSlug: 'lagerplatz' },
});

type Layout = (properties: LocalizedCollectionPage) => Promise<React.ReactNode> | React.ReactNode;

const render = async (
  layout: unknown,
  slugs: string[],
  previewDocumentId?: string,
): Promise<{ props: Record<string, unknown> }> =>
  (await (layout as Layout)({
    locale: 'de',
    slugs,
    renderInPreviewMode: true,
    previewDocumentId,
    searchParams: Promise.resolve({ preview: 'true', previewId: OTHER }),
  })) as { props: Record<string, unknown> };

describe('a shared preview link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on a generic page', () => {
    it('renders the document of the link, whichever one the URL asks for', async () => {
      mockPageByID.mockImplementation((id: string) => Promise.resolve(draft(id)));

      const element = await render(GenericPage, ['lagerplatz'], LINKED);

      expect(element.props['page']).toMatchObject({ id: LINKED });
      expect(mockPageByID).toHaveBeenCalledWith(LINKED, 'de', true);
    });

    it('leaves the documents a page embeds on their published state', async () => {
      mockPageByID.mockImplementation((id: string) => Promise.resolve(draft(id)));

      const shared = await render(GenericPage, ['lagerplatz'], LINKED);
      const editor = await render(GenericPage, ['lagerplatz']);

      expect(shared.props['renderInPreviewMode']).toBe(false);
      expect(editor.props['renderInPreviewMode']).toBe(true);
    });

    it('refuses the draft behind the slug when the link is for another collection', async () => {
      mockPageByID.mockRejectedValue(new Error('Not Found'));
      mockPageBySlug.mockResolvedValue({ docs: [draft(OTHER)] });

      await expect(render(GenericPage, ['lagerplatz'], LINKED)).rejects.toBe(NOT_FOUND);
    });
  });

  describe('on a blog post', () => {
    it('renders the post of the link', async () => {
      mockBlogBySlug.mockResolvedValue({ docs: [draft(LINKED)] });

      const element = await render(BlogPostPage, ['lagerplatz'], LINKED);

      expect(element.props['article']).toMatchObject({ id: LINKED });
    });

    it('refuses another post, and does not offer its other languages', async () => {
      mockBlogBySlug.mockResolvedValue({ docs: [draft(OTHER)] });

      await expect(render(BlogPostPage, ['lagerplatz'], LINKED)).rejects.toBe(NOT_FOUND);
      expect(mockBlogBySlug).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    ['form preview', FormsPreviewPage],
    ['timeline preview', TimelinePreviewPage],
  ])('on the %s', (_name, layout) => {
    it('reads the document of the link', async () => {
      mockFind.mockResolvedValue({ docs: [{ id: LINKED }] });

      await render(layout, [LINKED], LINKED);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true, where: { id: { equals: LINKED } } }),
      );
    });

    it('refuses another document before it reads it', async () => {
      await expect(render(layout, [OTHER], LINKED)).rejects.toBe(NOT_FOUND);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('lets an editor open any document', async () => {
      mockFind.mockResolvedValue({ docs: [{ id: OTHER }] });

      await render(layout, [OTHER]);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { equals: OTHER } } }),
      );
    });
  });
});
