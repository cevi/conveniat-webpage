import type { MigrationLockStore } from '@/lib/db/migration-lock';

/** The collection the lock lives in. Payload does not know it, so it never shows in the admin panel. */
export const MIGRATION_LOCK_COLLECTION = 'payload-migration-lock';

const LOCK_ID = 'migrations';

export interface LockDocument {
  _id: string;
  holder: string;
  expiresAt: Date;
}

const DUPLICATE_KEY = 11_000;

/**
 * The part of a MongoDB database the lock uses. Declared here instead of imported from `mongodb`:
 * mongoose brings its own copy of the driver, so the driver's classes of our dependency are not
 * the ones the connection hands out, and neither is its `MongoServerError` for `instanceof`.
 */
export interface LockDatabase {
  collection(name: string): {
    insertOne(document: LockDocument): Promise<unknown>;
    updateOne(
      filter: Record<string, unknown>,
      update: { $set: Partial<LockDocument> },
    ): Promise<{ matchedCount: number; modifiedCount: number }>;
    deleteOne(filter: Record<string, unknown>): Promise<unknown>;
  };
}

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY;

/**
 * Keeps the migration lock as one document with a fixed `_id` in the Payload database. The
 * unique `_id` is what makes taking the lock atomic: of two replicas inserting it, one gets a
 * duplicate key error. Every other change matches on the holder or on the lease, so it is a
 * single atomic update as well. No transactions needed, which the standalone Mongo lacks.
 *
 * @param db - the database Payload migrates
 * @returns the store {@link runWithMigrationLock} takes the lock in
 */
export const createMongoMigrationLockStore = (db: LockDatabase): MigrationLockStore => {
  const locks = db.collection(MIGRATION_LOCK_COLLECTION);
  return {
    insert: async (holder, expiresAt): Promise<boolean> => {
      try {
        await locks.insertOne({ _id: LOCK_ID, holder, expiresAt });
        return true;
      } catch (error: unknown) {
        if (isDuplicateKeyError(error)) return false;
        throw error;
      }
    },
    takeOverExpired: async (holder, now, expiresAt): Promise<boolean> => {
      const result = await locks.updateOne(
        { _id: LOCK_ID, expiresAt: { $lte: now } },
        { $set: { holder, expiresAt } },
      );
      return result.modifiedCount === 1;
    },
    renew: async (holder, expiresAt): Promise<boolean> => {
      const result = await locks.updateOne({ _id: LOCK_ID, holder }, { $set: { expiresAt } });
      return result.matchedCount === 1;
    },
    release: async (holder): Promise<void> => {
      await locks.deleteOne({ _id: LOCK_ID, holder });
    },
  };
};
