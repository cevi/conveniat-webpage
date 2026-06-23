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
 */
const ensureVersionCollectionIndices = async (
  connection: MongooseAdapter['connection'],
  versionsCollectionName: string,
  locales: string[],
  isLocalized: boolean,
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

  await processIndexes(collection, tasks, versionsCollectionName);
};

/**
 * Deduplicates push notification subscriptions by token.
 * Since a unique constraint is defined on the token field, existing duplicates
 * will cause index creation to fail on MongoDB. This cleans them up beforehand.
 *
 * @param connection The MongoDB connection
 */
const deduplicatePushSubscriptions = async (
  connection: MongooseAdapter['connection'],
): Promise<void> => {
  const collection = connection.collection('push-notification-subscriptions');

  try {
    const duplicates = await collection
      .aggregate([
        { $group: { _id: '$token', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 }, _id: { $exists: true } } },
      ])
      .toArray();

    if (duplicates.length > 0) {
      console.log(`${LOG_PREFIX} Found ${duplicates.length} duplicate push tokens to clean up`);
      let deletedCount = 0;

      for (const document_ of duplicates) {
        // Keep the most recent (assuming last is most recent, or just keep one)
        // Actually Payload _id (ObjectId) sorts chronologically
        const documents = document_['docs'] as string[];
        documents.sort(); // Sort ObjectIds as strings
        const remove = documents.slice(0, -1); // Remove all but the last one

        if (remove.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await collection.deleteMany({ _id: { $in: remove as any[] } });
          deletedCount += result.deletedCount;
        }
      }

      console.log(`${LOG_PREFIX} Deleted ${deletedCount} duplicate push subscription records`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Failed to deduplicate push subscriptions: ${message}`);
  }
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

  // Run Deduplication for Push Notification Subscriptions BEFORE index creation
  // to ensure the unique index on `token` can be created.
  await deduplicatePushSubscriptions(connection);

  // Kick off Entity Processing (Promise)
  const entityPromises = entities.map(async (entity) => {
    const isLocalized = entity.fields.some((f) => 'name' in f && f.name === '_localized_status');
    const versionsCollectionName = `_${entity.slug}_versions`;

    const entityTasks: Promise<void>[] = [];

    // Main Collection Indices
    if (isLocalized && entity.type === 'collection') {
      entityTasks.push(ensureCollectionLocalizedIndices(connection, entity.slug, locales));
    }

    // Version Collection Indices
    if (Boolean(entity.versions?.drafts)) {
      entityTasks.push(
        ensureVersionCollectionIndices(connection, versionsCollectionName, locales, isLocalized),
      );
    }

    await Promise.all(entityTasks);
  });

  await Promise.all(entityPromises);

  console.log(`${LOG_PREFIX} Finished ensuring indices.`);
};
