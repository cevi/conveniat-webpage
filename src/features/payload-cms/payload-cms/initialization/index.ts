import { deleteDatabase } from '@/features/payload-cms/payload-cms/initialization/deleting';
import { ensureIndexes } from '@/features/payload-cms/payload-cms/initialization/ensure-indexes';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import {
  announceRunningJobsWith,
  getRunningJobIds,
} from '@/features/payload-cms/payload-cms/tasks/active-job-tracking';
import prisma from '@/lib/db/prisma';
import { withSpan } from '@/utils/tracing-helpers';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Payload } from 'payload';

const LOCK_FILE = path.join(process.cwd(), 'seeding.lock');

// Generate a stable worker ID for this process instance
export const workerId = crypto.randomUUID();
let heartbeatStarted = false;

const startWorkerHeartbeat = (payload: Payload): void => {
  const hostname = os.hostname();
  // The id of this worker's own document, kept so a heartbeat is a single write. A job start
  // waits for whatever heartbeat is in flight before it can publish its claim, so every round
  // trip that is not made shortens that wait. Cleared whenever a write fails, which is what a
  // deleted document looks like from here, so the next beat looks it up again.
  let workerDocumentId: number | string | undefined;

  const sendHeartbeat = async (): Promise<void> => {
    try {
      const autoRun = payload.config.jobs.autoRun;
      let autoRunQueues: { queue?: string }[] = [];
      if (Array.isArray(autoRun)) {
        autoRunQueues = autoRun;
      } else if (typeof autoRun === 'function') {
        const resolved = await autoRun(payload);
        if (Array.isArray(resolved)) {
          autoRunQueues = resolved;
        }
      }
      const queues = autoRunQueues.map((q) => ({ name: q.queue ?? 'default' }));

      if (workerDocumentId === undefined) {
        // Find if this worker already exists in database
        const existing = await payload.find({
          collection: 'payload-workers',
          where: {
            workerId: { equals: workerId },
          },
          limit: 1,
          context: { internal: true },
        });
        workerDocumentId = existing.docs[0]?.id;
      }

      const now = new Date().toISOString();
      // The jobs this worker is on, so the stale-job cleanup leaves them alone. A job that
      // finishes between two heartbeats drops out of the list on the next one, which is soon
      // enough: nothing cleans up a job that is no longer processing.
      const runningJobIds = getRunningJobIds();
      const activeJobIds = runningJobIds.map((jobId) => ({ jobId }));
      // A replica of the previous release reads `activeJobId` and knows nothing of the list.
      // Production starts the new container before it stops the old one, so for the length of
      // that overlap the old replica's cleanup would see this worker as idle and delete a job
      // it is running. Writing the oldest id here as well keeps it readable on both sides.
      // eslint-disable-next-line unicorn/no-null
      const activeJobId = runningJobIds[0] ?? null;

      const written = await (workerDocumentId === undefined
        ? payload.create({
            collection: 'payload-workers',
            data: {
              workerId,
              hostname,
              queues,
              lastHeartbeat: now,
              activeJobIds,
              activeJobId,
            },
            context: { internal: true },
          })
        : payload.update({
            collection: 'payload-workers',
            id: workerDocumentId,
            data: {
              lastHeartbeat: now,
              queues,
              activeJobIds,
              activeJobId,
            },
            context: { internal: true },
          }));
      workerDocumentId = written.id;
    } catch (error: unknown) {
      workerDocumentId = undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      payload.logger.error(
        `[Worker Heartbeat] Failed to send heartbeat for worker ${workerId}: ${errorMessage}`,
      );
    }
  };

  // Every heartbeat replaces the whole list of claims, and the interval, the start-up beat and
  // a job start can all fire at once. Two of them in flight together would let the older write
  // land last and erase the claim the newer one just published, so they go one after another
  // and each reads the running jobs when its turn comes. `sendHeartbeat` handles its own
  // errors, so the chain cannot end up rejected.
  let heartbeats: Promise<void> = Promise.resolve();
  const queueHeartbeat = (): void => {
    heartbeats = heartbeats.then(sendHeartbeat);
  };

  // A worker has to claim a job before the next cleanup pass runs, which is every ten seconds,
  // so a job start sends its own heartbeat instead of waiting for the interval. The runner
  // starts a batch of up to ten jobs in one tick, and this publishes all of them in one write.
  let extraHeartbeatScheduled = false;
  announceRunningJobsWith(() => {
    if (extraHeartbeatScheduled) {
      return;
    }
    extraHeartbeatScheduled = true;
    setTimeout(() => {
      extraHeartbeatScheduled = false;
      queueHeartbeat();
    }, 0);
  });

  // Send immediate heartbeat
  queueHeartbeat();

  // Update heartbeat every 30 seconds
  const interval = setInterval(() => {
    queueHeartbeat();
  }, 30_000);

  // Unref interval so it does not block process exit (especially in tests)
  if (typeof interval.unref === 'function') {
    interval.unref();
  }
};

/**
 * This function is called when the Payload server has started.
 * @param payload The Payload instance
 */
export const onPayloadInit = async (payload: Payload): Promise<void> => {
  if (!heartbeatStarted) {
    heartbeatStarted = true;
    startWorkerHeartbeat(payload);
  }

  const globalForInit = globalThis as unknown as {
    __payloadInitCompleted__?: boolean;
  };

  if (globalForInit.__payloadInitCompleted__ === true) {
    return;
  }

  // Clear stale preferences for payload-jobs to resolve cached groupBy/where field CastErrors
  try {
    await payload.delete({
      collection: 'payload-preferences',
      where: {
        or: [{ key: { equals: 'collection-payload-jobs' } }, { key: { equals: 'payload-jobs' } }],
      },
      context: { internal: true },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    payload.logger.error(
      { err: error },
      `[Initialization] Failed to clear stale payload-jobs preferences: ${errorMessage}`,
    );
  }

  // Check if database is already seeded first
  try {
    const { totalDocs: userCount } = await payload.count({ collection: 'users' });
    const { totalDocs: genericPageCount } = await payload.count({ collection: 'generic-page' });
    if (userCount > 0 || genericPageCount > 0) {
      payload.logger.info('[Lock Manager] Database already seeded. Skipping seeding.');
      // If the database is already seeded, make sure the lock file is marked as 'done' so other workers skip waiting
      await fs.writeFile(LOCK_FILE, 'done').catch(() => {});

      // Run in the background so index generation doesn't block the first request
      void withSpan('payload.init.ensureIndexes', async () => {
        await ensureIndexes(payload);
      }).catch((error: unknown) => {
        payload.logger.error({ err: error }, '[Index Manager] Index verification failed');
      });

      globalForInit.__payloadInitCompleted__ = true;
      return;
    }
  } catch (error: unknown) {
    payload.logger.error({ err: error }, '[Lock Manager] Failed to check database seeding status');
  }

  // Database is empty. Remove any stale lock file left on host disk from a previous volume wipe.
  await fs.rm(LOCK_FILE, { force: true }).catch(() => {});

  // Attempt atomic lock acquisition using OS exclusive write flag
  let acquiredLock = false;
  try {
    const handle = await fs.open(LOCK_FILE, 'wx');
    await handle.write('seeding');
    await handle.close();
    acquiredLock = true;
  } catch (error: unknown) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
      payload.logger.error({ err: error }, '[Lock Manager] Failed to create lock file');
    }
  }

  if (acquiredLock) {
    payload.logger.info(
      '[Lock Manager] Acquired database initialization lock. Starting seeding and indexing...',
    );
    try {
      // Ensure Postgres Prisma tables exist before seeding
      try {
        await prisma.$queryRaw`SELECT 1 FROM "public"."User" LIMIT 1`;
      } catch {
        payload.logger.info(
          '[Lock Manager] Prisma tables missing. Pushing Prisma schema to Postgres...',
        );
        const { execSync } = await import('node:child_process');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      }

      await withSpan('payload.init.seed', async () => {
        await seedDatabase(payload);
        payload.logger.info('Seeding complete.');
      }).catch((error: unknown) => {
        payload.logger.error({ err: error }, '[Lock Manager] Seeding failed');
      });

      // Run in the background so index generation doesn't block the first request
      void withSpan('payload.init.ensureIndexes', async () => {
        await ensureIndexes(payload);
      }).catch((error: unknown) => {
        payload.logger.error({ err: error }, '[Index Manager] Index verification failed');
      });

      // Mark the lock as successfully done
      await fs.writeFile(LOCK_FILE, 'done');
      payload.logger.info('[Lock Manager] Database initialization complete. Lock released.');
      globalForInit.__payloadInitCompleted__ = true;
    } catch (error: unknown) {
      payload.logger.error({ err: error }, '[Lock Manager] Database initialization failed');
      // Clean up lock file on crash so initialization can be retried
      await fs.rm(LOCK_FILE, { force: true }).catch(() => {});
    }
  } else {
    payload.logger.info(
      '[Lock Manager] Lock already held by another worker. Waiting for completion...',
    );
    let retries = 0;
    while (retries < 60) {
      try {
        const content = await fs.readFile(LOCK_FILE, 'utf8');
        if (content === 'done') {
          payload.logger.info(
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
    payload.logger.warn('[Lock Manager] Timeout waiting for database initialization to complete.');
  }
};

export const deleteEverything = async (payload: Payload): Promise<void> => {
  payload.logger.info('Deleting everything...');

  // Reset the global initialization completed flag so a reset database re-runs seeding/indexing
  const globalForInit = globalThis as unknown as {
    __payloadInitCompleted__?: boolean;
  };
  globalForInit.__payloadInitCompleted__ = false;

  // Remove the lock file so a manual database reset allows fresh seeding
  await fs.rm(LOCK_FILE, { force: true }).catch(() => {});

  await deleteDatabase(payload).catch((error: unknown) => {
    payload.logger.error({ err: error }, 'Failed to delete the Payload database');
  });

  await prisma
    .$transaction([
      prisma.pushNotificationLog.deleteMany(),
      prisma.messageEvent.deleteMany(),
      prisma.message.deleteMany(),
      prisma.chatMembership.deleteMany(),
      prisma.chat.deleteMany(),
      prisma.user.deleteMany(),
    ])
    .catch((error: unknown) => {
      payload.logger.error({ err: error }, 'Failed to delete the Prisma tables');
    });

  payload.logger.info('Done.');
};
