import { isPayloadInitCompleted } from '@/features/payload-cms/payload-cms/initialization/init-state';
import prisma from '@/lib/db/prisma';
import { createLogger } from '@/utils/server-logger';
import { connection } from 'next/server';

const logger = createLogger('status');

// Latched: once both databases answered, a later blip must not fail the healthcheck, or Swarm
// would replace a replica that only has to wait for its database to come back.
let postgresReached = false;

const json = (body: Record<string, string>, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * The healthcheck of Swarm and Traefik. Answers 503 until this process has initialized Payload,
 * which reaches Mongo and runs the pending migrations, and has reached Postgres once; from then
 * on it answers ok. A release that cannot reach its databases therefore never takes traffic, and
 * Swarm stops its rollout instead of replacing the running replicas.
 */
export async function GET(): Promise<Response> {
  // without it, the handler is prerendered at build and answers whatever the build saw
  await connection();

  if (!isPayloadInitCompleted()) {
    logger.debug('Not ready: Payload has not finished initializing');
    return json({ status: 'starting', message: 'Payload is still initializing.' }, 503);
  }

  if (!postgresReached) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresReached = true;
    } catch (error: unknown) {
      logger.debug('Not ready: Postgres is unreachable', { error });
      return json({ status: 'starting', message: 'Postgres is unreachable.' }, 503);
    }
  }

  return json({ status: 'ok' }, 200);
}
