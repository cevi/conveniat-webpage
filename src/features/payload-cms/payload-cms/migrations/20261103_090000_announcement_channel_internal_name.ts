import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/**
 * Gives every announcement channel from before the split an internal name, the same as its chat
 * name, so the required field is filled and the channel picker of an announcement keeps showing a
 * name. Written on the raw collection: `payload.update` would rerun the Postgres chat sync.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const channels = payload.db.collections['announcement-channels']?.collection;
  if (channels === undefined) return;

  const { modifiedCount } = await channels.updateMany(
    { $or: [{ internalName: { $not: { $type: 'string' } } }, { internalName: '' }] },
    [{ $set: { internalName: '$name' } }],
  );
  if (modifiedCount > 0) {
    payload.logger.info(`Gave ${String(modifiedCount)} announcement channels an internal name`);
  }
}

/** Not reversible: editors may have renamed the channels since. */
export async function down(): Promise<void> {}
