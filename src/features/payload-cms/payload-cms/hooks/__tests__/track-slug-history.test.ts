import { trackSlugHistory } from '@/features/payload-cms/payload-cms/hooks/track-slug-history';
import { rememberDraftSave } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { PayloadRequest, SanitizedCollectionConfig } from 'payload';

jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

const PAGE_ID = '65f0c1a2b3d4e5f6a7b8c9d0';
const pages = { slug: 'generic-page' } as unknown as SanitizedCollectionConfig;

interface SeoData {
  seo: { urlSlug?: string; urlSlugHistory?: { slug?: string }[] };
}

/** The page as the database stores it: the published state, every locale side by side. */
const storedPage = (
  urlSlug: Record<string, string>,
  published: Record<string, boolean>,
): object => ({
  id: PAGE_ID,
  seo: { urlSlug },
  _localized_status: Object.fromEntries(
    Object.entries(published).map(([locale, value]) => [locale, { published: value }]),
  ),
});

/** Runs one save of the page in German through the hooks in the order Payload runs them. */
const save = async (
  stored: object | null,
  data: SeoData,
  options: { draft: boolean; latestDraft?: SeoData; publish?: boolean },
): Promise<SeoData> => {
  const request = {
    context: {},
    locale: 'de',
    payload: { db: { findOne: jest.fn().mockResolvedValue(stored) } },
  } as unknown as PayloadRequest;

  await rememberDraftSave({
    args: {
      id: PAGE_ID,
      draft: options.draft,
      data: options.publish === true ? { _status: 'published' } : {},
    },
    operation: 'update',
    req: request,
  } as unknown as Parameters<typeof rememberDraftSave>[0]);

  return (await trackSlugHistory({
    collection: pages,
    context: request.context,
    data,
    operation: 'update',
    originalDoc: { id: PAGE_ID, ...(options.latestDraft ?? data) },
    req: request,
  })) as SeoData;
};

describe('trackSlugHistory', () => {
  it('keeps the slugs an editor types under autosave out of the history', async () => {
    const stored = storedPage({ de: 'slug-1a2b3c4d' }, { de: false });

    const typed = await save(
      stored,
      { seo: { urlSlug: 'cevi-uster', urlSlugHistory: [] } },
      { draft: true, latestDraft: { seo: { urlSlug: 'cevi-us' } } },
    );

    expect(typed.seo.urlSlugHistory).toEqual([]);
  });

  it('keeps the random initial slug out when a page is published for the first time', async () => {
    const stored = storedPage({ de: 'slug-1a2b3c4d' }, { de: false });

    const published = await save(
      stored,
      { seo: { urlSlug: 'cevi-uster', urlSlugHistory: [] } },
      { draft: false, publish: true, latestDraft: { seo: { urlSlug: 'cevi-uste' } } },
    );

    expect(published.seo.urlSlugHistory).toEqual([]);
  });

  it('records the published slug, not the latest draft, when a renamed page is published', async () => {
    const stored = storedPage({ de: 'hof-zueri-11', fr: 'cour-zurich-11' }, { de: true, fr: true });

    const published = await save(
      stored,
      { seo: { urlSlug: 'zueri-11', urlSlugHistory: [{ slug: 'hof-zueri' }] } },
      { draft: false, publish: true, latestDraft: { seo: { urlSlug: 'zueri-1' } } },
    );

    expect(published.seo.urlSlugHistory).toEqual([{ slug: 'hof-zueri-11' }, { slug: 'hof-zueri' }]);
  });

  it('records nothing when the published slug is already in the history or unchanged', async () => {
    const stored = storedPage({ de: 'zueri-11' }, { de: true });

    const renamedBack = await save(
      stored,
      { seo: { urlSlug: 'hof-zueri-11', urlSlugHistory: [{ slug: 'zueri-11' }] } },
      { draft: false, publish: true },
    );
    const unchanged = await save(
      stored,
      { seo: { urlSlug: 'zueri-11', urlSlugHistory: [] } },
      { draft: false, publish: true },
    );

    expect(renamedBack.seo.urlSlugHistory).toEqual([{ slug: 'zueri-11' }]);
    expect(unchanged.seo.urlSlugHistory).toEqual([]);
  });
});
