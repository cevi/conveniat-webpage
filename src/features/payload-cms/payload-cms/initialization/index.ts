import { deleteDatabase } from '@/features/payload-cms/payload-cms/initialization/deleting';
import { ensureIndexes } from '@/features/payload-cms/payload-cms/initialization/ensure-indexes';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import prisma from '@/lib/db/prisma';
import { withSpan } from '@/utils/tracing-helpers';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Payload } from 'payload';

const LOCK_FILE = path.join(process.cwd(), 'seeding.lock');

/**
 * This function is called when the Payload server has started.
 * @param payload The Payload instance
 */
export const onPayloadInit = async (payload: Payload): Promise<void> => {
  const globalForInit = globalThis as unknown as {
    __payloadInitCompleted__?: boolean;
  };

  if (globalForInit.__payloadInitCompleted__ === true) {
    return;
  }

  // Fast-path: Check if the lock file already exists and is marked as 'done'.
  // Under Next.js dynamic routing / Fast Refresh / separate sandbox compilation,
  // this avoids running database checks and index ensuring repeatedly on every single request.
  try {
    const lockContent = await fs.readFile(LOCK_FILE, 'utf8');
    if (lockContent === 'done') {
      globalForInit.__payloadInitCompleted__ = true;
      return;
    }
  } catch {
    // Lock file doesn't exist or is not written yet, proceed to normal checks
  }

  // Check if database is already seeded first
  try {
    const { totalDocs: userCount } = await payload.count({ collection: 'users' });
    const { totalDocs: genericPageCount } = await payload.count({ collection: 'generic-page' });
    if (userCount > 0 || genericPageCount > 0) {
      console.log('[Lock Manager] Database already seeded. Skipping seeding.');
      // If the database is already seeded, make sure the lock file is marked as 'done' so other workers skip waiting
      await fs.writeFile(LOCK_FILE, 'done').catch(() => {});

      // Run in the background so index generation doesn't block the first request
      void withSpan('payload.init.ensureIndexes', async () => {
        await ensureIndexes(payload);
      }).catch(console.error);

      globalForInit.__payloadInitCompleted__ = true;
      return;
    }
  } catch (error) {
    console.error('[Lock Manager] Failed to check database seeding status:', error);
  }

  // Attempt atomic lock acquisition using OS exclusive write flag
  let acquiredLock = false;
  try {
    const handle = await fs.open(LOCK_FILE, 'wx');
    await handle.write('seeding');
    await handle.close();
    acquiredLock = true;
  } catch (error: unknown) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
      console.error('[Lock Manager] Failed to create lock file:', error);
    }
  }

  if (acquiredLock) {
    console.log(
      '[Lock Manager] Acquired database initialization lock. Starting seeding and indexing...',
    );
    try {
      await withSpan('payload.init.seed', async () => {
        await seedDatabase(payload);
        console.log('Seeding complete.');
      }).catch(console.error);

      // Run in the background so index generation doesn't block the first request
      void withSpan('payload.init.ensureIndexes', async () => {
        await ensureIndexes(payload);
      }).catch(console.error);

      // Mark the lock as successfully done
      await fs.writeFile(LOCK_FILE, 'done');
      console.log('[Lock Manager] Database initialization complete. Lock released.');
      globalForInit.__payloadInitCompleted__ = true;
    } catch (error) {
      console.error('[Lock Manager] Database initialization failed:', error);
      // Clean up lock file on crash so initialization can be retried
      await fs.rm(LOCK_FILE, { force: true }).catch(() => {});
    }
  } else {
    console.log('[Lock Manager] Lock already held by another worker. Waiting for completion...');
    let retries = 0;
    while (retries < 60) {
      try {
        const content = await fs.readFile(LOCK_FILE, 'utf8');
        if (content === 'done') {
          console.log(
            '[Lock Manager] Database initialization successfully completed by the other worker. Skipping.',
          );
          globalForInit.__payloadInitCompleted__ = true;
          return;
        }
      } catch {
        // Lock file might be missing or in transition, retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }
    console.warn('[Lock Manager] Timeout waiting for database initialization to complete.');
  }
};

export const deleteEverything = async (payload: Payload): Promise<void> => {
  console.log('########################\n# Deleting everything...\n########################\n');

  // Reset the global initialization completed flag so a reset database re-runs seeding/indexing
  const globalForInit = globalThis as unknown as {
    __payloadInitCompleted__?: boolean;
  };
  globalForInit.__payloadInitCompleted__ = false;

  // Remove the lock file so a manual database reset allows fresh seeding
  await fs.rm(LOCK_FILE, { force: true }).catch(() => {});

  await deleteDatabase(payload).catch(console.error);

  await prisma
    .$transaction([
      prisma.messageEvent.deleteMany(),
      prisma.message.deleteMany(),
      prisma.chatMembership.deleteMany(),
      prisma.chat.deleteMany(),
      prisma.user.deleteMany(),
    ])
    .catch(console.error);

  console.log('Done.');
};
