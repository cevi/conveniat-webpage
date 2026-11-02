import { migrateFormPlaceholders } from '@/features/payload-cms/payload-cms/initialization/migrate-form-placeholders';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/**
 * Runs the placeholder migration again, for the form versions its first run could not write:
 * their older fields failed the current schema's cast. It now writes through the raw driver.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await migrateFormPlaceholders(payload);
}

/** Not reversible: the localized placeholders are what the form fields read now. */
export async function down(): Promise<void> {}
