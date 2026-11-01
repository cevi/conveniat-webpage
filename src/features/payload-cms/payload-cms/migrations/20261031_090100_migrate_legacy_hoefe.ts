import { migrateLegacyHoefe } from '@/features/payload-cms/payload-cms/initialization/migrate-legacy-hoefe';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/** Fills the Höfe collection from the legacy events of the bill settings. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await migrateLegacyHoefe(payload);
}

/** The legacy list was never modified, so there is nothing to put back. */
export async function down(): Promise<void> {}
