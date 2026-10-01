import type { VersionEntry } from '@/features/payload-cms/payload-cms/utils/version-history';
import {
  groupVersionHistory,
  toVersionEntry,
} from '@/features/payload-cms/payload-cms/utils/version-history';

const entry = (id: string, status: VersionEntry['status']): VersionEntry => ({
  id,
  createdAt: '2026-09-30T18:00:00.000Z',
  updatedAt: '2026-09-30T18:00:00.000Z',
  autosave: status === 'draft',
  status,
  publishedLocales: [],
  editorName: undefined,
});

describe('groupVersionHistory', () => {
  it('keeps drafts newer than the last publication apart as pending', () => {
    const history = groupVersionHistory([
      entry('draft-2', 'draft'),
      entry('draft-1', 'draft'),
      entry('published', 'published'),
    ]);

    expect(history.pending.map((version) => version.id)).toEqual(['draft-2', 'draft-1']);
    expect(history.publications.map((publication) => publication.version.id)).toEqual([
      'published',
    ]);
  });

  it('files each draft under the publication it led to', () => {
    const history = groupVersionHistory([
      entry('published-2', 'published'),
      entry('autosave-2', 'draft'),
      entry('published-1', 'published'),
      entry('saved-1', 'draft'),
      entry('autosave-1', 'draft'),
    ]);

    expect(history.pending).toEqual([]);
    expect(
      history.publications.map((publication) => [
        publication.version.id,
        publication.drafts.map((draft) => draft.id),
      ]),
    ).toEqual([
      ['published-2', ['autosave-2']],
      ['published-1', ['saved-1', 'autosave-1']],
    ]);
  });

  it('treats a document that was never published as pending only', () => {
    const history = groupVersionHistory([entry('draft-2', 'draft'), entry('draft-1', 'draft')]);

    expect(history.pending).toHaveLength(2);
    expect(history.publications).toEqual([]);
  });
});

describe('toVersionEntry', () => {
  it('reads the status, the live locales and the editor', () => {
    expect(
      toVersionEntry({
        id: 'v1',
        createdAt: '2026-09-30T18:31:00.000Z',
        updatedAt: '2026-09-30T18:47:00.000Z',
        autosave: true,
        version: {
          _status: 'published',
          _localized_status: {
            de: { published: true },
            fr: { published: false },
            en: { published: true },
          },
          lastEditedByUser: { id: 'u1', fullName: 'Lena Brunner', nickname: 'Pixel' },
        },
      }),
    ).toEqual({
      id: 'v1',
      createdAt: '2026-09-30T18:31:00.000Z',
      updatedAt: '2026-09-30T18:47:00.000Z',
      autosave: true,
      status: 'published',
      publishedLocales: ['de', 'en'],
      editorName: 'Lena Brunner v/o Pixel',
    });
  });

  it('uses the full name alone when there is no nickname', () => {
    const version = toVersionEntry({
      id: 'v1',
      updatedAt: '2026-09-30T18:47:00.000Z',
      version: { lastEditedByUser: { id: 'u1', fullName: 'Lena Brunner', nickname: '' } },
    });

    expect(version?.editorName).toBe('Lena Brunner');
  });

  it('survives a version from before the fields existed', () => {
    expect(toVersionEntry({ id: 'v1', updatedAt: '2026-09-30T18:47:00.000Z' })).toEqual({
      id: 'v1',
      createdAt: '2026-09-30T18:47:00.000Z',
      updatedAt: '2026-09-30T18:47:00.000Z',
      autosave: false,
      status: 'draft',
      publishedLocales: [],
      editorName: undefined,
    });
  });

  it('shows no name when the reader may not read users and only gets the id', () => {
    const version = toVersionEntry({
      id: 'v1',
      updatedAt: '2026-09-30T18:47:00.000Z',
      version: { lastEditedByUser: '6abd54ebf520812ce3dc3992' },
    });

    expect(version?.editorName).toBeUndefined();
  });

  it('skips a row without an id', () => {
    expect(toVersionEntry({ updatedAt: '2026-09-30T18:47:00.000Z' })).toBeUndefined();
    expect(toVersionEntry('6abd54ebf520812ce3dc3992')).toBeUndefined();
  });
});
