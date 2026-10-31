import {
  migrateFileDownloadBlocks,
  migrateFileDownloadGroups,
} from '@/features/payload-cms/payload-cms/initialization/migrate-file-download-groups';
import type { BasePayload } from 'payload';

const DOCUMENT_ID = '64b7f0c2a1b2c3d4e5f60718';
/** the id Payload would have given the array row, the hex form of an ObjectId */
const ROW_ID = expect.stringMatching(/^[\da-f]{24}$/) as unknown;
const MIGRATED_BLOCK = {
  blockType: 'fileDownload',
  groups: [{ id: ROW_ID, files: [DOCUMENT_ID] }],
};

type StoredDocument = Record<string, unknown>;

interface FakeMongoCollection {
  find: jest.Mock;
  updateOne: jest.Mock;
}

/** A driver collection over fixed documents: `find` matches top-level equality only. */
const fakeMongoCollection = (documents: StoredDocument[]): FakeMongoCollection => ({
  find: jest.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/require-await
    async function* (filter: StoredDocument): AsyncGenerator<StoredDocument> {
      for (const document of documents) {
        if (Object.entries(filter).every(([key, value]) => document[key] === value)) {
          yield structuredClone(document);
        }
      }
    },
  ),
  updateOne: jest.fn().mockResolvedValue({}),
});

const mainContentField = {
  name: 'mainContent',
  type: 'blocks',
  blocks: [{ slug: 'fileDownload', flattenedFields: [] }],
};

const createPayload = (stored: {
  pages: StoredDocument[];
  pageVersions: StoredDocument[];
  globals: StoredDocument[];
}): {
  payload: BasePayload;
  pages: FakeMongoCollection;
  pageVersions: FakeMongoCollection;
  globals: FakeMongoCollection;
  users: FakeMongoCollection;
  info: jest.Mock;
} => {
  const pages = fakeMongoCollection(stored.pages);
  const pageVersions = fakeMongoCollection(stored.pageVersions);
  const globals = fakeMongoCollection(stored.globals);
  const users = fakeMongoCollection([{ _id: 'user-1', name: 'Cevi Uster' }]);
  const info = jest.fn();

  const payload = {
    config: {
      blocks: [],
      collections: [
        { slug: 'generic-page', flattenedFields: [mainContentField], versions: {} },
        { slug: 'users', flattenedFields: [{ name: 'name', type: 'text' }] },
      ],
      globals: [{ slug: 'landing', flattenedFields: [mainContentField] }],
    },
    db: {
      collections: {
        'generic-page': { collection: pages },
        users: { collection: users },
      },
      versions: { 'generic-page': { collection: pageVersions } },
      globals: { collection: globals },
    },
    logger: { info, warn: jest.fn(), error: jest.fn() },
  } as unknown as BasePayload;

  return { payload, pages, pageVersions, globals, users, info };
};

describe('migrateFileDownloadBlocks', () => {
  it('moves the file of a block into a group of its own', () => {
    const block = {
      id: 'block-1',
      blockType: 'fileDownload',
      file: DOCUMENT_ID,
      openInNewTab: true,
    };

    expect(migrateFileDownloadBlocks(block)).toBe(true);
    expect(block).toEqual({
      id: 'block-1',
      blockType: 'fileDownload',
      groups: [{ id: ROW_ID, files: [DOCUMENT_ID] }],
      openInNewTab: true,
    });
  });

  it('finds the block in every locale and inside accordions', () => {
    const mainContent = {
      de: [
        {
          blockType: 'accordion',
          accordionBlocks: [{ valueBlocks: [{ blockType: 'fileDownload', file: DOCUMENT_ID }] }],
        },
      ],
      fr: [{ blockType: 'fileDownload', file: DOCUMENT_ID }],
    };

    expect(migrateFileDownloadBlocks(mainContent)).toBe(true);
    expect(mainContent).toEqual({
      de: [{ blockType: 'accordion', accordionBlocks: [{ valueBlocks: [MIGRATED_BLOCK] }] }],
      fr: [MIGRATED_BLOCK],
    });
  });

  it('gives a draft saved without a file an empty group', () => {
    // eslint-disable-next-line unicorn/no-null
    const block = { blockType: 'fileDownload', file: null };

    expect(migrateFileDownloadBlocks(block)).toBe(true);
    expect(block).toEqual({ blockType: 'fileDownload', groups: [{ id: ROW_ID, files: [] }] });
  });

  it('leaves migrated blocks and other blocks with a file field alone', () => {
    const blocks = [
      { blockType: 'fileDownload', groups: [{ id: 'row', files: [DOCUMENT_ID] }] },
      { blockType: 'singlePicture', file: DOCUMENT_ID },
    ];
    const before = structuredClone(blocks);

    expect(migrateFileDownloadBlocks(blocks)).toBe(false);
    expect(blocks).toEqual(before);
  });
});

describe('migrateFileDownloadGroups', () => {
  it('rewrites documents, versions and globals that hold the old block, and nothing else', async () => {
    const { payload, pages, pageVersions, globals, users, info } = createPayload({
      pages: [
        { _id: 'page-1', mainContent: { de: [{ blockType: 'fileDownload', file: DOCUMENT_ID }] } },
        { _id: 'page-2', mainContent: { de: [{ blockType: 'richTextSection' }] } },
      ],
      pageVersions: [
        {
          _id: 'version-1',
          version: { mainContent: { de: [{ blockType: 'fileDownload', file: DOCUMENT_ID }] } },
        },
      ],
      globals: [
        {
          _id: 'landing',
          globalType: 'landing',
          mainContent: { fr: [{ blockType: 'fileDownload', file: DOCUMENT_ID }] },
        },
        {
          _id: 'other',
          globalType: 'other',
          mainContent: [{ blockType: 'fileDownload', file: DOCUMENT_ID }],
        },
      ],
    });

    await migrateFileDownloadGroups(payload);

    expect(pages.updateOne).toHaveBeenCalledTimes(1);
    expect(pages.updateOne).toHaveBeenCalledWith(
      { _id: 'page-1' },
      { $set: { mainContent: { de: [MIGRATED_BLOCK] } } },
    );
    expect(pageVersions.updateOne).toHaveBeenCalledWith(
      { _id: 'version-1' },
      { $set: { 'version.mainContent': { de: [MIGRATED_BLOCK] } } },
    );
    // only the global whose config holds the block, not the one sharing its Mongo collection
    expect(globals.updateOne).toHaveBeenCalledTimes(1);
    expect(globals.updateOne).toHaveBeenCalledWith(
      { _id: 'landing' },
      { $set: { mainContent: { fr: [MIGRATED_BLOCK] } } },
    );
    expect(users.find).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      { counts: { 'generic-page': 1, 'generic-page (versions)': 1, landing: 1 } },
      expect.any(String),
    );
  });

  it('writes and logs nothing once every block is migrated', async () => {
    const { payload, pages, info } = createPayload({
      pages: [
        {
          _id: 'page-1',
          mainContent: {
            de: [{ blockType: 'fileDownload', groups: [{ id: 'row-1', files: [DOCUMENT_ID] }] }],
          },
        },
      ],
      pageVersions: [],
      globals: [],
    });

    await migrateFileDownloadGroups(payload);

    expect(pages.updateOne).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
