import { isRecord } from '@/features/payload-cms/payload-cms/utils/document-references';
import crypto from 'node:crypto';
import type { BasePayload, FlattenedBlock, FlattenedField, SanitizedConfig } from 'payload';

const BLOCK_SLUG = 'fileDownload';

type MongoCollection = BasePayload['db']['collections'][string]['collection'];

/** A Mongo collection holding documents with file download blocks, and where they sit in it. */
interface FileDownloadSource {
  name: string;
  collection: MongoCollection;
  filter: Record<string, unknown>;
  /** the top-level paths that can hold the block, `version.` prefixed for versions */
  paths: string[];
}

/** An array row id as Payload writes it, the hex form of an ObjectId. */
const newRowId = (): string => crypto.randomBytes(12).toString('hex');

/**
 * Rewrites every file download block in `value` from the single `file` it held before the block
 * took several files to one group holding that file. Walks the stored data as it is, so the
 * block is found inside localized fields, accordions and columns alike.
 *
 * @param value Stored data, mutated in place.
 * @returns Whether a block was rewritten.
 */
export const migrateFileDownloadBlocks = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    let migrated = false;
    for (const entry of value) {
      if (migrateFileDownloadBlocks(entry)) migrated = true;
    }
    return migrated;
  }
  if (!isRecord(value)) return false;

  if (value['blockType'] === BLOCK_SLUG && 'file' in value) {
    const file = value['file'];
    if (!Array.isArray(value['groups'])) {
      // a draft could be saved without a file, it gets an empty group to fill in
      value['groups'] = [
        { id: newRowId(), files: file === null || file === undefined ? [] : [file] },
      ];
    }
    delete value['file'];
    return true;
  }

  let migrated = false;
  for (const entry of Object.values(value)) {
    if (migrateFileDownloadBlocks(entry)) migrated = true;
  }
  return migrated;
};

const canHoldBlock = (
  field: FlattenedField,
  blocks: ReadonlyMap<string, FlattenedBlock>,
  chain: readonly string[] = [],
): boolean => {
  switch (field.type) {
    case 'group':
    case 'tab':
    case 'array': {
      return field.flattenedFields.some((nested) => canHoldBlock(nested, blocks, chain));
    }
    case 'blocks': {
      return [...field.blocks, ...(field.blockReferences ?? [])]
        .map((block) => (typeof block === 'string' ? blocks.get(block) : block))
        .filter(
          (block): block is FlattenedBlock => block !== undefined && !chain.includes(block.slug),
        )
        .some(
          (block) =>
            block.slug === BLOCK_SLUG ||
            block.flattenedFields.some((nested) =>
              canHoldBlock(nested, blocks, [...chain, block.slug]),
            ),
        );
    }
    default: {
      return false;
    }
  }
};

const versioned = (paths: string[]): string[] => paths.map((path) => `version.${path}`);

/** Every Mongo collection that can hold a file download block, drafts and versions included. */
const listFileDownloadSources = (payload: BasePayload): FileDownloadSource[] => {
  const config: SanitizedConfig = payload.config;
  const blocks = new Map((config.blocks ?? []).map((block) => [block.slug, block]));
  const pathsOf = (fields: FlattenedField[]): string[] =>
    fields.filter((field) => canHoldBlock(field, blocks)).map((field) => field.name);

  const collections = config.collections.flatMap(({ slug, flattenedFields, versions }) => {
    const paths = pathsOf(flattenedFields);
    const model = payload.db.collections[slug];
    const versionModel = payload.db.versions[slug];
    return [
      ...(model === undefined
        ? []
        : [{ name: slug, collection: model.collection, filter: {}, paths }]),
      ...(versions === undefined || versionModel === undefined
        ? []
        : [
            {
              name: `${slug} (versions)`,
              collection: versionModel.collection,
              filter: {},
              paths: versioned(paths),
            },
          ]),
    ];
  });

  const globals = config.globals.flatMap(({ slug, flattenedFields, versions }) => {
    const paths = pathsOf(flattenedFields);
    const versionModel = payload.db.versions[slug];
    return [
      {
        name: slug,
        collection: payload.db.globals.collection,
        filter: { globalType: slug },
        paths,
      },
      ...(versions === undefined || versionModel === undefined
        ? []
        : [
            {
              name: `${slug} (versions)`,
              collection: versionModel.collection,
              filter: {},
              paths: versioned(paths),
            },
          ]),
    ];
  });

  return [...collections, ...globals].filter(({ paths }) => paths.length > 0);
};

const valueAt = (document: Record<string, unknown>, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), document);

/** Rewrites the blocks of one source and returns how many documents it changed. */
const migrateSource = async (payload: BasePayload, source: FileDownloadSource): Promise<number> => {
  // projected to the fields that can hold the block, a page version is mostly other content
  const cursor = source.collection.find(
    { ...source.filter },
    { projection: Object.fromEntries(source.paths.map((path) => [path, 1])) },
  );
  let migrated = 0;

  for await (const document of cursor) {
    const changes: Record<string, unknown> = {};
    for (const path of source.paths) {
      const value = valueAt(document, path);
      if (migrateFileDownloadBlocks(value)) changes[path] = value;
    }
    if (Object.keys(changes).length === 0) continue;

    try {
      // the raw driver, so the stored ids keep their type and no schema strips the old field
      await source.collection.updateOne({ _id: document._id }, { $set: changes });
      migrated += 1;
    } catch (error: unknown) {
      payload.logger.error(
        { err: error, source: source.name, id: String(document._id) },
        'Failed to migrate the file download blocks of a document',
      );
    }
  }
  return migrated;
};

/**
 * Moves the file of every file download block into a group of its own, see
 * {@link migrateFileDownloadBlocks}. Documents, drafts, versions and globals are rewritten, so
 * restoring an older version brings back a block the renderer understands.
 *
 * Runs once, as a Payload migration, and is idempotent: a block without `file` is left untouched.
 * A document that fails keeps its old block, which renders nothing, and is logged as an error,
 * since nothing retries it.
 *
 * @param payload The Payload instance.
 */
export const migrateFileDownloadGroups = async (payload: BasePayload): Promise<void> => {
  const counts: Record<string, number> = {};
  for (const source of listFileDownloadSources(payload)) {
    const migrated = await migrateSource(payload, source);
    if (migrated > 0) counts[source.name] = migrated;
  }

  if (Object.keys(counts).length > 0) {
    payload.logger.info({ counts }, 'Moved the files of file download blocks into groups');
  }
};
