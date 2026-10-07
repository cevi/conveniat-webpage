import {
  flushPageCacheOnChange,
  flushPageCacheOnChangeGlobal,
  rememberDraftSave,
  rememberDraftSaveGlobal,
  rememberLinkTarget,
} from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { revalidateTag } from 'next/cache';
import type { PayloadRequest, SanitizedCollectionConfig, SanitizedGlobalConfig } from 'payload';

jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

const PAGE_ID = '65f0c1a2b3d4e5f6a7b8c9d0';

const pages = {
  slug: 'generic-page',
  versions: { drafts: { autosave: true } },
} as unknown as SanitizedCollectionConfig;

const images = { slug: 'images', versions: false } as unknown as SanitizedCollectionConfig;

const header = {
  slug: 'header',
  versions: { drafts: { autosave: true } },
} as unknown as SanitizedGlobalConfig;

type CollectionSave = Parameters<typeof rememberDraftSave>[0];
type CollectionChange = Parameters<typeof flushPageCacheOnChange>[0];
type GlobalSave = Parameters<typeof rememberDraftSaveGlobal>[0];
type GlobalChange = Parameters<typeof flushPageCacheOnChangeGlobal>[0];

/** A request whose database returns the given link targets, one per read. */
const requestReading = (...linkTargets: (object | null)[]): PayloadRequest => {
  const findOne = jest.fn();
  for (const linkTarget of linkTargets) findOne.mockResolvedValueOnce(linkTarget);
  return {
    context: {},
    payload: { db: { findOne }, logger: { debug: jest.fn(), warn: jest.fn() } },
  } as unknown as PayloadRequest;
};

/** Runs the hooks of one save of a page in the order Payload runs them. */
const savePage = async (
  request: PayloadRequest,
  operationArguments: { draft?: boolean; data: { _status?: string } },
): Promise<void> => {
  const save = {
    args: { id: PAGE_ID, ...operationArguments },
    collection: pages,
    operation: 'update',
    req: request,
  } as unknown as CollectionSave;
  await rememberDraftSave(save);
  await rememberLinkTarget(save);
  await flushPageCacheOnChange({
    collection: pages,
    doc: { id: PAGE_ID, _status: operationArguments.data._status ?? 'draft' },
    req: request,
  } as unknown as CollectionChange);
};

const flushedTags = (): string[] => jest.mocked(revalidateTag).mock.calls.map(([tag]) => tag);

const linkTarget = (urlSlug: string, published: boolean): object => ({
  id: PAGE_ID,
  _localized_status: { de: { published } },
  seo: { urlSlug: { de: urlSlug } },
});

describe('flushPageCacheOnChange', () => {
  beforeEach(() => jest.mocked(revalidateTag).mockClear());

  it('keeps the cache when autosave stores a draft', async () => {
    await savePage(requestReading(), { draft: true, data: { _status: 'draft' } });

    expect(flushedTags()).toEqual([]);
  });

  it('flushes only the page when its content is published', async () => {
    const request = requestReading(linkTarget('anmeldung', true), linkTarget('anmeldung', true));

    await savePage(request, { draft: true, data: { _status: 'published' } });

    expect(flushedTags()).toEqual(['collection:generic-page', `doc:generic-page:${PAGE_ID}`]);
  });

  it('flushes everything when the published slug changes', async () => {
    const request = requestReading(linkTarget('anmeldung', true), linkTarget('anmelden', true));

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything when a page is published for the first time', async () => {
    const request = requestReading(linkTarget('anmeldung', false), linkTarget('anmeldung', true));

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything when a page is unpublished in a locale', async () => {
    const request = requestReading(linkTarget('anmeldung', true), linkTarget('anmeldung', false));

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('does not mistake an unpublish for an autosave', async () => {
    // both send `_status: 'draft'`, only autosave sends `draft` with it
    const request = requestReading(
      { ...linkTarget('anmeldung', true), _status: 'published' },
      { ...linkTarget('anmeldung', true), _status: 'draft' },
    );

    await savePage(request, { data: { _status: 'draft' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything when the link target could not be read before the save', async () => {
    const request = requestReading();
    jest.mocked(request.payload.db.findOne).mockRejectedValueOnce(new Error('connection lost'));

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything when the link target could not be read after the save', async () => {
    const request = requestReading(linkTarget('anmeldung', true));
    jest.mocked(request.payload.db.findOne).mockRejectedValueOnce(new Error('connection lost'));

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything when an old slug starts to redirect to the page', async () => {
    const request = requestReading(linkTarget('anmeldung', true), {
      ...linkTarget('anmeldung', true),
      seo: { urlSlug: { de: 'anmeldung' }, urlSlugHistory: { de: [{ slug: 'anmelden' }] } },
    });

    await savePage(request, { data: { _status: 'published' } });

    expect(flushedTags()).toContain('payload');
  });

  it('flushes everything for a collection other documents embed', async () => {
    const request = requestReading();
    // a collection without drafts writes the live document whatever `draft` says
    await rememberDraftSave({
      args: { draft: true, data: {} },
      collection: images,
      operation: 'update',
      req: request,
    } as unknown as CollectionSave);

    await flushPageCacheOnChange({
      collection: images,
      doc: { id: 'image-1' },
      req: request,
    } as unknown as CollectionChange);

    expect(flushedTags()).toEqual(['payload', 'collection:images', 'doc:images:image-1']);
  });

  it('flushes everything when no hook recorded how the document was saved', async () => {
    await flushPageCacheOnChange({
      collection: pages,
      doc: { id: PAGE_ID, _status: 'draft' },
      req: requestReading(),
    } as unknown as CollectionChange);

    expect(flushedTags()).toContain('payload');
  });
});

/** Runs the hooks of one save of the header in the order Payload runs them. */
const saveHeader = async (operationArguments: {
  draft?: boolean;
  data: { _status: string };
}): Promise<void> => {
  const request = requestReading();
  await rememberDraftSaveGlobal({
    args: operationArguments,
    global: header,
    operation: 'update',
    req: request,
  } as unknown as GlobalSave);
  await flushPageCacheOnChangeGlobal({
    doc: { _status: operationArguments.data._status },
    global: header,
    req: request,
  } as unknown as GlobalChange);
};

describe('flushPageCacheOnChangeGlobal', () => {
  beforeEach(() => jest.mocked(revalidateTag).mockClear());

  it('keeps the cache when autosave stores a draft', async () => {
    await saveHeader({ draft: true, data: { _status: 'draft' } });

    expect(flushedTags()).toEqual([]);
  });

  it('flushes everything when the global is published', async () => {
    await saveHeader({ draft: true, data: { _status: 'published' } });

    expect(flushedTags()).toEqual(['payload', 'global:header']);
  });
});
