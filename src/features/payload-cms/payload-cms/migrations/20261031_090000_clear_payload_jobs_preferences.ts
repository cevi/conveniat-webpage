import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/**
 * Drops the stored list preferences of the jobs collection. They still held a `groupBy` and
 * `where` on fields the collection no longer has, and the list view failed with a CastError for
 * every admin who had them.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.delete({
    collection: 'payload-preferences',
    where: {
      or: [{ key: { equals: 'collection-payload-jobs' } }, { key: { equals: 'payload-jobs' } }],
    },
    req,
    context: { internal: true },
  });
}

/** The deleted preferences are gone; the next visit to the list stores fresh ones. */
export async function down(): Promise<void> {}
