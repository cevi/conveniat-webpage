import { migrateFormPlaceholders } from '@/features/payload-cms/payload-cms/initialization/migrate-form-placeholders';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/** Turns the plain string placeholders of form fields into localized ones. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await migrateFormPlaceholders(payload);
}

/** Not reversible: the localized placeholders are what the form fields read now. */
export async function down(): Promise<void> {}
