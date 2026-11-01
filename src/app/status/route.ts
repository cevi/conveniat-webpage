import { hasPayloadInitFailed } from '@/features/payload-cms/payload-cms/initialization/init-state';
import prisma from '@/lib/db/prisma';
import { createLogger } from '@/utils/server-logger';
import { connection } from 'next/server';

const logger = createLogger('status');

// Latched: once Postgres answered, a later blip must not fail the healthcheck, or Swarm would
// replace a replica that only has to wait for its database to come back.
let postgresReached = false;

const json = (body: Record<string, string>, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * The healthcheck of Swarm and Traefik. Answers 503 once initializing Payload failed in this
 * process, which happens when Mongo is unreachable or a migration throws, and until Postgres has
 * answered once. Swarm then stops the rollout of a release that cannot reach its databases, and
 * replaces a replica Payload will not initialize again.
 *
 * A replica that is still initializing answers ok: how long the pending migrations take is not
 * bounded by the healthcheck's start period, and a request waits for the initialization anyway.
 */
export async function GET(): Promise<Response> {
  // without it, the handler is prerendered at build and answers whatever the build saw
  await connection();

  if (hasPayloadInitFailed()) {
    logger.debug('Not healthy: initializing Payload failed');
    return json({ status: 'error', message: 'Initializing Payload failed.' }, 503);
  }

  if (!postgresReached) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresReached = true;
    } catch (error: unknown) {
      logger.debug('Not healthy: Postgres is unreachable', { error });
      return json({ status: 'error', message: 'Postgres is unreachable.' }, 503);
    }
  }

  return json({ status: 'ok' }, 200);
}
