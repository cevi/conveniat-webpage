import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { IndexSpecification } from 'mongodb';
import type { Payload } from 'payload';

const LOG_PREFIX = '[Index Manager]';

interface IndexTask {
  name: string;
  spec: IndexSpecification;
}

interface SimpleCollection {
  createIndex: (spec: IndexSpecification) => Promise<string>;
}

/**
 * Safely creates an index without throwing to prevent startup crashes.
 * Wraps the native createIndex in a try/catch block.
 */
const createIndexSafe = async (
  collection: SimpleCollection,
  indexSpec: IndexSpecification,
  description: string,
): Promise<void> => {
  try {
    await collection.createIndex(indexSpec);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Failed to ensure index for ${description}: ${message}`);
  }
};

/**
 * Batch processor to run index creations in parallel.
 */
const processIndexes = async (
  collection: SimpleCollection,
  tasks: IndexTask[],
  collectionName: string,
): Promise<void> => {
  if (tasks.length === 0) return;

  // Execute all index creations for this collection in parallel
  await Promise.all(
    tasks.map((task) => createIndexSafe(collection, task.spec, `${collectionName} (${task.name})`)),
  );

  console.log(`${LOG_PREFIX} Verified ${tasks.length} indices for ${collectionName}`);
};

/**
 * Ensures localized indices for the form-submissions collection.
 *
 * Why: When forms are viewed in the admin panel, the 'join' field fetch form submissions
 * for the current locale using filters like { formen: id }, { formde: id }, etc.
 * Sorted by createdAt descending to show the latest submissions first.
 *
 * @param connection The MongoDB connection
 * @param locales The available locales
 */
const ensureFormSubmissionIndexes = async (
  connection: MongooseAdapter['connection'],
  locales: string[],
): Promise<void> => {
  const collection = connection.collection('form-submissions');

  const tasks: IndexTask[] = locales.map((locale) => ({
    name: `locale_${locale}`,
    spec: { [`form${locale}`]: 1, createdAt: -1 },
  }));

  await processIndexes(collection, tasks, 'form-submissions');
};

/**
 * Ensures localized indices for main collections that use the _localized_status pattern.
 *
 * Why: Our custom localization logic stores publishing status per locale in _localized_status.
 * Queries to fetch only published documents in a specific locale use filters like
 * { "_localized_status.en.published": true }.
 *
 * @param connection The MongoDB connection
 * @param collectionName The name of the collection
 * @param locales The available locales
 */
const ensureCollectionLocalizedIndices = async (
  connection: MongooseAdapter['connection'],
  collectionName: string,
  locales: string[],
): Promise<void> => {
  const collection = connection.collection(collectionName);

  const tasks: IndexTask[] = locales.map((locale) => ({
    name: `status_${locale}`,
    spec: { [`_localized_status.${locale}.published`]: 1, updatedAt: -1 },
  }));

  await processIndexes(collection, tasks, collectionName);
};

/**
 * Ensures compound indices for routable collections using internalPageName.
 *
 * Why: findAlternatives query in metadata-helper.ts filters by internalPageName
 * and localized publishing status across all locales.
 *
 * @param connection The MongoDB connection
 * @param collectionName The name of the collection
 * @param locales The available locales
 */
const ensureInternalPageNameIndices = async (
  connection: MongooseAdapter['connection'],
  collectionName: string,
  locales: string[],
): Promise<void> => {
  const collection = connection.collection(collectionName);

  const tasks: IndexTask[] = locales.map((locale) => ({
    name: `internalNameStatus_${locale}`,
    spec: { internalPageName: 1, [`_localized_status.${locale}.published`]: 1 },
  }));

  await processIndexes(collection, tasks, collectionName);
};

/**
 * Ensures indices for version collections, including general and localized publishing status.
 *
 * Why:
 * 1. General Index: Used by Payload to find the latest draft or published version across all locales.
 *    Including 'latest' helps quickly identify the current version.
 * 2. Localized Indices: Used by our custom publishing logic to find the latest version that was
 *    specifically published for a given locale.
 *
 * @param connection The MongoDB connection
 * @param versionsCollectionName The name of the versions collection
 * @param locales The available locales
 * @param isLocalized Whether the collection is localized
 */
const ensureVersionCollectionIndices = async (
  connection: MongooseAdapter['connection'],
  versionsCollectionName: string,
  locales: string[],
  isLocalized: boolean,
): Promise<void> => {
  const collection = connection.collection(versionsCollectionName);

  const tasks: IndexTask[] = [
    {
      name: 'general_lookup',
      spec: { parent: 1, 'version._status': 1, latest: 1, updatedAt: -1 },
    },
  ];

  if (isLocalized) {
    tasks.push(
      ...locales.map((locale) => ({
        name: `localized_lookup_${locale}`,
        spec: {
          parent: 1,
          [`version._localized_status.${locale}.published`]: 1,
          updatedAt: -1,
        },
      })),
    );
  }

  await processIndexes(collection, tasks, versionsCollectionName);
};

/**
 * Ensures indices for upload-enabled collections (media).
 *
 * Why:
 * 1. Filename: Used for duplicate checks and lookups by filename.
 * 2. UpdatedAt: Used for sorting in the admin panel list view.
 *
 * @param connection The MongoDB connection
 * @param collectionName The name of the collection
 */
const ensureUploadCollectionIndexes = async (
  connection: MongooseAdapter['connection'],
  collectionName: string,
): Promise<void> => {
  const collection = connection.collection(collectionName);

  const tasks: IndexTask[] = [
    {
      name: 'filename',
      spec: { filename: 1 },
    },
    {
      name: 'updatedAt',
      spec: { updatedAt: -1 },
    },
  ];

  await processIndexes(collection, tasks, collectionName);
};

/**
 * Ensures indices for the globals collection.
 *
 * Why: The globals collection stores various global documents. Some queries filter by 'globalType'.
 *
 * @param connection The MongoDB connection
 */
const ensureGlobalsCollectionIndexes = async (
  connection: MongooseAdapter['connection'],
): Promise<void> => {
  const collection = connection.collection('globals');

  const tasks: IndexTask[] = [
    {
      name: 'globalType',
      spec: { globalType: 1 },
    },
  ];

  await processIndexes(collection, tasks, 'globals');
};

/**
 * Prints a beautified list of all existing indexes in the database.
 *
 * @param connection The MongoDB connection
 */
const printAllIndexes = async (connection: MongooseAdapter['connection']): Promise<void> => {
  const db = connection.db;
  if (db === undefined) return;

  const collections = await db.listCollections().toArray();
  console.log(`\n${LOG_PREFIX} --- Current Database Indexes ---`);

  // Sort collections by name for better readability
  const sortedCollections = collections.sort((a, b) => a.name.localeCompare(b.name));

  for (const colInfo of sortedCollections) {
    const col = connection.collection(colInfo.name);
    const indexes = await col.listIndexes().toArray();

    process.stdout.write(`  [${colInfo.name}]\n`);

    for (const index of indexes) {
      const typedIndex = index as unknown as { key: Record<string, number | string>; name: string };
      const keys = Object.entries(typedIndex.key)
        .map(([key, val]) => `${key}: ${String(val)}`)
        .join(', ');
      process.stdout.write(`    - ${typedIndex.name.padEnd(30)} { ${keys} }\n`);
    }
  }

  console.log(`${LOG_PREFIX} ----------------------------------\n`);
};

export const ensureIndexes = async (payload: Payload): Promise<void> => {
  const { db, config } = payload;

  if (db.name !== 'mongoose') return;

  console.log(`${LOG_PREFIX} Starting index verification...`);

  const connection = (db as MongooseAdapter).connection;
  const localization = config.localization;

  // Normalize locales efficiently
  let locales: string[] = [];
  if (Boolean(localization)) {
    locales = (localization as { locales: (string | { code: string })[] }).locales.map((l) =>
      typeof l === 'string' ? l : l.code,
    );
  }

  // Prepare Entity List
  const collections = config.collections.map((c) => ({ ...c, type: 'collection' as const }));
  const globals = config.globals.map((g) => ({ ...g, type: 'global' as const }));
  const entities = [...collections, ...globals];

  if (entities.length === 0) return;

  // Kick off Form Submissions (Promise)
  const formPromise = ensureFormSubmissionIndexes(connection, locales);

  // Kick off Globals (Promise)
  const globalsPromise = ensureGlobalsCollectionIndexes(connection);

  // Kick off Entity Processing (Promise)
  const entityPromises = entities.map(async (entity) => {
    const isLocalized = entity.fields.some((f) => 'name' in f && f.name === '_localized_status');
    const versionsCollectionName = `_${entity.slug}_versions`;

    const entityTasks: Promise<void>[] = [];

    // Main Collection Indices
    if (isLocalized && entity.type === 'collection') {
      entityTasks.push(ensureCollectionLocalizedIndices(connection, entity.slug, locales));
    }

    // internalPageName compound indices for routable collections
    const hasInternalPageName = entity.fields.some(
      (f) => 'name' in f && f.name === 'internalPageName',
    );
    if (hasInternalPageName && entity.type === 'collection') {
      entityTasks.push(ensureInternalPageNameIndices(connection, entity.slug, locales));
    }

    // Upload Collection Indices
    if (entity.type === 'collection' && 'upload' in entity && Boolean(entity.upload)) {
      entityTasks.push(ensureUploadCollectionIndexes(connection, entity.slug));
    }

    // Version Collection Indices
    if (Boolean(entity.versions?.drafts)) {
      entityTasks.push(
        ensureVersionCollectionIndices(connection, versionsCollectionName, locales, isLocalized),
      );
    }

    await Promise.all(entityTasks);
  });

  await Promise.all([formPromise, globalsPromise, ...entityPromises]);

  await printAllIndexes(connection);

  console.log(`${LOG_PREFIX} Finished ensuring indices.`);
};
