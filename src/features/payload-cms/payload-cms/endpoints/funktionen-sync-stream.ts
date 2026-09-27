import { environmentVariables } from '@/config/environment-variables';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  describeFunktionenSyncFailure,
  syncFunktionen,
  type FunktionenSyncStreamMessage,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { getHitobito } from '@/lib/hitobito';
import { randomUUID } from 'node:crypto';
import type { PayloadHandler } from 'payload';

/**
 * POST /api/funktionen/sync – syncs the camp functions from Cevi.DB now, as the nightly job
 * does, and streams its progress as newline-delimited {@link FunktionenSyncStreamMessage}s so
 * the Funktionen list shows a progress bar. A failure after the first frame is an `error`
 * frame, since the status code is already sent by then.
 */
export const funktionenSyncStreamHandler: PayloadHandler = (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rootGroupId = environmentVariables.CEVIDB_FUNCTIONS_ROOT_GROUP_ID;
  if (rootGroupId === '') {
    return Response.json({ error: 'No functions root group is configured' }, { status: 409 });
  }

  const { logger } = request.payload;
  // Every line of a run carries its id, so one run can be pulled out of Loki as a whole.
  const runId = randomUUID();
  const context = { 'funktionen.run_id': runId, 'funktionen.root_group': rootGroupId };
  const startedAt = Date.now();
  const encoder = new TextEncoder();
  // Set when the reader goes away. The run still finishes, but nothing may be enqueued any more.
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      const send = (message: FunktionenSyncStreamMessage): void => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      };

      logger.info({ ...context, 'user.id': request.user?.id }, 'Camp functions sync started');
      try {
        const hitobito = await getHitobito(request.payload);
        const result = await syncFunktionen(
          request.payload,
          {
            getGroupName: (groupId) => hitobito.groups.getGroupName(groupId),
            listSubgroups: (groupId) => hitobito.groups.listSubgroups(groupId),
            listPeopleWithRole: (groupId, roleClass) =>
              hitobito.groups.listPeopleWithRole(groupId, roleClass),
          },
          rootGroupId,
          (progress) => send({ type: 'progress', ...progress }),
        );
        send({ type: 'done', result });
        logger.info(
          {
            ...context,
            'funktionen.groups': result.groups,
            'funktionen.created': result.created,
            'funktionen.updated': result.updated,
            'funktionen.removed': result.removed,
            'funktionen.users_written': result.usersWritten,
            'duration.ms': Date.now() - startedAt,
          },
          'Synced the camp functions from Cevi.DB',
        );
      } catch (error: unknown) {
        const failure = describeFunktionenSyncFailure(error);
        logger.error(
          {
            ...context,
            err: error,
            'funktionen.failure': failure,
            'duration.ms': Date.now() - startedAt,
          },
          'Syncing the camp functions from Cevi.DB failed; the functions stay as they were',
        );
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          failure,
        });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel(): void {
      cancelled = true;
      logger.warn(
        { ...context, 'duration.ms': Date.now() - startedAt },
        'Camp functions sync stream closed by the client; the sync runs on',
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // without it a buffering reverse proxy holds the frames back until the end
      'X-Accel-Buffering': 'no',
    },
  });
};
