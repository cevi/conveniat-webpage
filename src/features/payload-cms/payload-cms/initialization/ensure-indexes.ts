import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { IndexSpecification } from 'mongodb';
import type { Payload } from 'payload';

type Logger = Payload['logger'];

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
  logger: Logger,
): Promise<void> => {
  try {
    await collection.createIndex(indexSpec);
  } catch (error: unknown) {
    logger.warn({ err: error }, `${LOG_PREFIX} Failed to ensure index for ${description}`);
  }
};

/**
 * Batch processor to run index creations in parallel.
 */
const processIndexes = async (
  collection: SimpleCollection,
  tasks: IndexTask[],
  collectionName: string,
  logger: Logger,
): Promise<void> => {
  if (tasks.length === 0) return;

  // Execute all index creations for this collection in parallel
  await Promise.all(
    tasks.map((task) =>
      createIndexSafe(collection, task.spec, `${collectionName} (${task.name})`, logger),
    ),
  );

  // once per collection on every boot of every replica
  logger.debug(`${LOG_PREFIX} Verified ${tasks.length} indices for ${collectionName}`);
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
 * @param logger The Payload logger
 */
const ensureCollectionLocalizedIndices = async (
  connection: MongooseAdapter['connection'],
  collectionName: string,
  locales: string[],
  logger: Logger,
): Promise<void> => {
  const collection = connection.collection(collectionName);

  const tasks: IndexTask[] = locales.map((locale) => ({
    name: `status_${locale}`,
    spec: { [`_localized_status.${locale}.published`]: 1, updatedAt: -1 },
  }));

  await processIndexes(collection, tasks, collectionName, logger);
};

/**
 * Ensures indices for version collections, including general and localized publishing status.
 *
 * Why:
 * 1. Localized Indices: Used by our custom publishing logic to find the latest version that was
 *    specifically published for a given locale.
 *
 * @param connection The MongoDB connection
 * @param versionsCollectionName The name of the versions collection
 * @param locales The available locales
 * @param isLocalized Whether the collection is localized
 * @param logger The Payload logger
 */
const ensureVersionCollectionIndices = async (
  connection: MongooseAdapter['connection'],
  versionsCollectionName: string,
  locales: string[],
  isLocalized: boolean,
  logger: Logger,
): Promise<void> => {
  const collection = connection.collection(versionsCollectionName);

  const tasks: IndexTask[] = [];

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

  await processIndexes(collection, tasks, versionsCollectionName, logger);
};

export const ensureIndexes = async (payload: Payload): Promise<void> => {
  const { db, config, logger } = payload;

  if (db.name !== 'mongoose') return;

  logger.info(`${LOG_PREFIX} Starting index verification...`);

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

  // Kick off Entity Processing (Promise)
  interface EntityMinimal {
    slug: string;
    fields: Record<string, unknown>[];
    type: 'collection' | 'global';
    versions?: { drafts?: unknown };
  }
  const entityPromises = (entities as EntityMinimal[]).map(async (entity) => {
    const isLocalized = entity.fields.some((f) => 'name' in f && f['name'] === '_localized_status');
    const versionsCollectionName = `_${entity.slug}_versions`;

    const entityTasks: Promise<void>[] = [];

    // Main Collection Indices
    if (isLocalized && entity.type === 'collection') {
      entityTasks.push(ensureCollectionLocalizedIndices(connection, entity.slug, locales, logger));
    }

    // Version Collection Indices
    if (Boolean(entity.versions?.drafts)) {
      entityTasks.push(
        ensureVersionCollectionIndices(
          connection,
          versionsCollectionName,
          locales,
          isLocalized,
          logger,
        ),
      );
    }

    await Promise.all(entityTasks);
  });

  await Promise.all(entityPromises);

  logger.info(`${LOG_PREFIX} Finished ensuring indices.`);
};
