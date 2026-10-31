import { migrateFileDownloadGroups } from '@/features/payload-cms/payload-cms/initialization/migrate-file-download-groups';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/** Moves the file of every file download block into a group of its own. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await migrateFileDownloadGroups(payload);
}

/** Not reversible: the renderer only understands the grouped block. */
export async function down(): Promise<void> {}
