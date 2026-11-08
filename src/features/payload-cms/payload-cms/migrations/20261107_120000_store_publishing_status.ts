import { STORED_PUBLISHING_STATUS } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/** Documents read at once: each one reads its published version and its draft in every locale. */
const PAGE_SIZE = 10;

/**
 * Stores the publishing status of every document, so the first list after the release does not
 * work out every row again. A draft read of `publishingStatus` stores what it works out, so this
 * reads every document once. Safe to run twice: a stored status that still fits is read, not
 * worked out again.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const collections = payload.config.collections.filter((collection) =>
    collection.fields.some((field) => 'name' in field && field.name === STORED_PUBLISHING_STATUS),
  );

  for (const collection of collections) {
    const { slug } = collection;
    let page = 1;
    let hasNextPage = true;
    let documents = 0;
    while (hasNextPage) {
      const result = await payload.find({
        collection: slug,
        draft: true,
        depth: 0,
        limit: PAGE_SIZE,
        page,
        sort: 'createdAt',
        trash: true,
        select: { publishingStatus: true, updatedAt: true, [STORED_PUBLISHING_STATUS]: true },
      });
      documents += result.docs.length;
      hasNextPage = result.hasNextPage;
      page += 1;
    }
    payload.logger.info(`Stored the publishing status of ${String(documents)} ${slug} documents`);
  }
}

/** Nothing to undo: code without the stored status never reads it. */
export async function down(): Promise<void> {}
