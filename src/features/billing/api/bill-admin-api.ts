import { environmentVariables } from '@/config/environment-variables';
import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { runScopedLogger } from '@/features/billing/adapters/payload-logger.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { S3StorageAdapter } from '@/features/billing/adapters/s3-storage.adapter';
import type { BillingJobProgress } from '@/features/billing/ports/job-progress.port';
import { buildLatestJobWhere, selectTaskLogOutput } from '@/features/billing/services/job-log';
import { populateSubeventsUseCase } from '@/features/billing/services/populate-subevents';
import { previewPdfUseCase } from '@/features/billing/services/preview-pdf';
import type { PopulateSubeventsStreamMessage } from '@/features/billing/types';
import { BillingJobStatus, BillingTaskSlug } from '@/features/billing/types';
import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { randomUUID } from 'node:crypto';
import type { PayloadHandler } from 'payload';
import { z } from 'zod';

/**
 * Names why a stream was cancelled, without trusting the reason to have a useful `toString`.
 * Undici passes an `Error` when the socket goes, and nothing at all when the reader simply
 * releases its lock.
 */
const describeCancelReason = (reason: unknown): string | undefined => {
  if (reason === undefined || reason === null) return undefined;
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return JSON.stringify(reason);
};

/** Names the operator behind a manual action, for the participant's history. */
function describeActor(user: unknown): string {
  if (user !== null && typeof user === 'object') {
    const record = user as Record<string, unknown>;
    for (const key of ['name', 'email', 'id']) {
      const value = record[key];
      if (typeof value === 'string' && value !== '') return value;
    }
  }
  return 'unbekannt';
}

const ParticipantIdSchema = z.object({
  participantId: z.string().trim().min(1, 'Missing participantId'),
});

const SyncStatusQuerySchema = z.object({
  jobId: z.string().trim().min(1).nullable().optional(),
});

const PreviewPdfQuerySchema = z.object({
  participantId: z.string().trim().min(1).nullable().optional(),
  download: z.preprocess((val) => val === 'true', z.boolean()).optional(),
});

/**
 * POST /api/confidential/billing/sync – Sync participants from Cevi.DB
 */
export const billingSyncHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await request.payload.jobs.queue({
      task: BillingTaskSlug.SyncParticipants,
      input: {},
    });

    return Response.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Billing sync queue failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/generate – Generate QR Bill PDFs
 */
export const billingGenerateHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await request.payload.jobs.queue({
      task: BillingTaskSlug.GenerateBills,
      input: {},
    });

    return Response.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Billing generate queue failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/regenerate-all – Regenerate all existing bills
 */
export const billingRegenerateAllHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Enforced here, not only in the admin UI: this wipes every existing PDF and
    // invoice number, so a deployment has to opt in before it can be reached at all.
    if (!environmentVariables.BILLING_ALLOW_REGENERATE_ALL) {
      request.payload.logger.warn(
        'Rejected bulk regenerate: BILLING_ALLOW_REGENERATE_ALL is not enabled on this deployment.',
      );
      return Response.json(
        { error: 'Bulk regeneration is disabled on this deployment.' },
        { status: 403 },
      );
    }

    const participantRepo = new PayloadParticipantRepositoryAdapter(request.payload);
    const existing = await participantRepo.findForRegenerateAll();

    // Reset status to new
    for (const document_ of existing) {
      await participantRepo.update(document_.id, { status: 'new' });
    }

    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Bulk regenerate failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/regenerate-single – Regenerate a single bill
 */
export const billingRegenerateSingleHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const bodyJson = (await (request as unknown as Request).json()) as unknown;
    const parseResult = ParticipantIdSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    const { participantId } = parseResult.data;

    const participantRepo = new PayloadParticipantRepositoryAdapter(request.payload);

    // Regenerating used to set `new` on any row at all. On a participation already marked
    // `removed` that brought a cancelled registration back to life, and the next sync then
    // found an event whose Cevi.DB list no longer contained it — reporting the same
    // irreconcilable error on every run. A cancelled registration has to be reinstated in
    // the Cevi.DB, not here.
    const existing = await participantRepo.findById(participantId);
    if (existing?.status === 'removed') {
      return Response.json(
        {
          error:
            'Diese Anmeldung ist als „Entfernt“ markiert. Für eine entfernte Anmeldung wird keine ' +
            'Rechnung erstellt – die Anmeldung muss zuerst in der Cevi.DB wieder aktiviert werden.',
        },
        { status: 409 },
      );
    }

    await participantRepo.update(participantId, { status: 'new' });

    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(request.payload, participantId);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Single regenerate failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/remove-participant – cancel a registration by hand.
 *
 * The counterpart to the sync's own removal detection, for the cases it cannot see: a
 * participation cancelled outside the Cevi.DB, or one left stranded because a bill was
 * regenerated for someone who had already dropped out. Everything about the bill is kept —
 * invoice number, amount, PDFs — because a cancelled invoice still has to be traceable;
 * only the status moves.
 */
export const billingRemoveParticipantHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const bodyJson = (await (request as unknown as Request).json()) as unknown;
    const parseResult = ParticipantIdSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const participantRepo = new PayloadParticipantRepositoryAdapter(request.payload);
    const participant = await participantRepo.findById(parseResult.data.participantId);
    if (participant === null)
      return Response.json({ error: 'Teilnehmer nicht gefunden.' }, { status: 404 });

    if (participant.status === 'removed') {
      return Response.json(
        { error: 'Diese Anmeldung ist bereits als „Entfernt“ markiert.' },
        { status: 409 },
      );
    }

    const actor = describeActor(request.user);
    const now = new Date().toISOString();
    const history = Array.isArray(participant.syncHistory) ? participant.syncHistory : [];

    await participantRepo.update(participant.id, {
      status: 'removed',
      removedDate: now,
      syncHistory: [
        ...history,
        {
          date: now,
          action: 'manually_removed',
          reviewReason:
            `Manuell auf „Entfernt“ gesetzt durch ${actor}. Eine allfällige Rechnung bleibt zur ` +
            `Nachvollziehbarkeit erhalten, wird aber nicht mehr als offen geführt.`,
        },
      ],
    } as never);

    request.payload.logger.info(
      `Participant ${String(participant.id)} manually marked as removed by ${actor}.`,
    );

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Manual removal failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/send – Send bills via email
 */
export const billingSendHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await request.payload.jobs.queue({
      task: BillingTaskSlug.SendBills,
      input: {},
    });

    return Response.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Billing send queue failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/send-single – Send bill via email for a single participant
 */
export const billingSendSingleHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyJson = (await (request as unknown as Request).json()) as unknown;
    const parseResult = ParticipantIdSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    const { participantId } = parseResult.data;

    const { sendBills } = await import('@/features/billing/services/email-service');
    const result = await sendBills(request.payload, participantId);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Single bill sending failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/send-pflichtangaben-reminder – Chase one registration
 *
 * The scheduled run covers a whole Hof at once; this is the operator asking for a single
 * row now, which is why it forces the schedule and skips the age check the weekly run
 * applies.
 */
export const billingSendPflichtangabenReminderHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyJson = (await (request as unknown as Request).json()) as unknown;
    const parseResult = ParticipantIdSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    const { participantId } = parseResult.data;

    const { NOT_MISSING_REASON, sendPflichtangabenReminders } =
      await import('@/features/billing/services/pflichtangaben-reminder');
    const result = await sendPflichtangabenReminders(request.payload, {
      force: true,
      participantId,
    });

    if (result.reason === NOT_MISSING_REASON) {
      return Response.json({ error: NOT_MISSING_REASON }, { status: 409 });
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error(
      { err: error },
      `Pflichtangaben reminder for a single registration failed: ${message}`,
    );
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/export-csv – Download finance CSV
 */
export const billingExportCsvHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generateFinanceCsv } = await import('@/features/billing/services/csv-export-service');
    const csv = await generateFinanceCsv(request.payload);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="conveniat27-billing-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `CSV export failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/preview-pdf – Serve a bill PDF
 */
export const billingPreviewPdfHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url ?? 'http://localhost');
    const queryParameters = {
      participantId: url.searchParams.get('participantId'),
      download: url.searchParams.get('download'),
    };
    const parseResult = PreviewPdfQuerySchema.safeParse(queryParameters);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    const { participantId, download: isDownload } = parseResult.data;

    const settingsRepo = new PayloadSettingsAdapter(request.payload);
    const participantRepo = new PayloadParticipantRepositoryAdapter(request.payload);
    const storagePort = new S3StorageAdapter();

    const { pdfBuffer, disposition } = await previewPdfUseCase(
      participantId,
      isDownload === true,
      participantRepo,
      storagePort,
      settingsRepo,
    );

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `PDF preview failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/export-xlsx – Finance overview workbook
 *
 * The Banana import as an Excel file: the same columns and bookings as the CSV next to it,
 * and the workbook the weekly finance mail attaches.
 */
export const billingExportXlsxHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generateFinanceOverviewWorkbook } =
      await import('@/features/billing/services/finance-overview-export');
    const workbook = await generateFinanceOverviewWorkbook(request.payload);
    const filename = `rechnungsuebersicht-${new Date().toISOString().slice(0, 10)}.xlsx`;

    request.payload.logger.info(
      `Finance overview workbook generated on demand by ${describeActor(request.user)}.`,
    );

    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Every bill with its amount: the browser must not keep a copy on disk.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Finance overview export failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/weekly-report-pdf – Download the weekly report now
 *
 * The same document the weekly mail attaches, rendered from the registrations as they
 * stand right now. It reads nothing but the participants, so it neither touches the
 * schedule nor writes `lastSentAt`: downloading a report must not stop the next mail.
 */
export const billingWeeklyReportPdfHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buildWeeklyReport } = await import('@/features/billing/services/weekly-report');
    const { buildWeeklyReportAttachment, findWeeklyReportParticipants } =
      await import('@/features/billing/services/weekly-report-document');

    const participants = await findWeeklyReportParticipants(request.payload);
    const report = buildWeeklyReport(participants, new Date());
    const { filename, content } = await buildWeeklyReportAttachment(report);

    request.payload.logger.info(
      `Weekly report PDF generated on demand by ${describeActor(request.user)}.`,
    );

    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Weekly report download failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/populate-subevents – Dynamically fetch subevents of group
 * 4337 and save them to the Höfe.
 *
 * The walk over every subgroup takes roughly 45 seconds, so the response is a stream of
 * newline-delimited {@link PopulateSubeventsStreamMessage} frames rather than a single
 * JSON body: the admin UI renders a progress bar and the names of the events as they are
 * discovered. Failures after the first frame are reported as an `error` frame, because
 * the status code is already on the wire by then.
 */
export const billingPopulateSubeventsHandler: PayloadHandler = async (request) => {
  const hasAccess = await canAccessBilling({ req: request });
  if (hasAccess !== true) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();

  // Every line this run writes carries the same id, so one walk can be pulled out of Loki as a
  // whole. Several editors may press the button at once, and each replica interleaves its own,
  // so without it the lines of two runs read as one.
  const runId = randomUUID();
  const logger = runScopedLogger(request.payload.logger, runId);
  const startedAt = Date.now();
  const elapsed = (): number => (Date.now() - startedAt) / 1000;

  // How far the walk had got, for the lines that report how it ended.
  let processedGroups = 0;
  let totalGroups = 0;
  // Set by `cancel` below. The walk keeps running after the reader goes away — it is most of
  // the way through a Cevi.DB pass and the Höfe write is worth finishing — but nothing may
  // be enqueued on a cancelled controller, and doing so throws.
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      const send = (message: PopulateSubeventsStreamMessage): void => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      };

      // The id, not the name or the mail address: the run id already tells two overlapping
      // runs apart, and an operator's mail address has no business sitting in Loki for it.
      logger.info('Subevent walk started', { 'billing.actor_id': request.user?.id });

      try {
        const settingsRepo = new PayloadSettingsAdapter(request.payload);
        const regManagement = await settingsRepo.getRegistrationManagement();
        const cookieValue = regManagement.browserCookie;
        const browserCookie =
          typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

        const hitobitoService = new HitobitoServiceAdapter(
          {
            baseUrl: HITOBITO_CONFIG.baseUrl,
            apiToken: HITOBITO_CONFIG.apiToken,
            browserCookie,
          },
          logger,
        );

        const result = await populateSubeventsUseCase(
          hitobitoService,
          settingsRepo,
          logger,
          (progress) => {
            processedGroups = progress.processedGroups;
            totalGroups = progress.totalGroups;
            send({ type: 'progress', ...progress });
          },
        );

        send({ type: 'done', newEvents: result.newEvents, allEvents: result.allEvents });
        logger.info('Subevent walk finished', {
          'billing.events_new': result.newEvents.length,
          'billing.events_stored': result.allEvents.length,
          'billing.total_groups': totalGroups,
          'billing.duration_seconds': elapsed(),
          'billing.stream_cancelled': cancelled,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Subevent walk failed', {
          'billing.processed_groups': processedGroups,
          'billing.total_groups': totalGroups,
          'billing.duration_seconds': elapsed(),
          error,
        });
        send({ type: 'error', error: message });
      } finally {
        if (!cancelled) controller.close();
      }
    },

    // Reached when the reader goes away: the editor navigated off the Höfe list, or the
    // browser dropped the request. Recorded so that a run which produced no result can be told
    // apart from one that failed on our side — the difference the admin panel cannot show,
    // because the error it renders is whatever the browser called the truncated body.
    cancel(reason: unknown): void {
      cancelled = true;
      logger.warn('Subevent walk stream cancelled by the client', {
        'billing.processed_groups': processedGroups,
        'billing.total_groups': totalGroups,
        'billing.duration_seconds': elapsed(),
        'billing.cancel_reason': describeCancelReason(reason),
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Without this a buffering reverse proxy would hold the frames back and the
      // progress bar would only appear once the whole walk is finished.
      'X-Accel-Buffering': 'no',
    },
  });
};

interface SyncJobStatus {
  id: string;
  taskSlug: BillingTaskSlug;
  status: BillingJobStatus;
  summary?: Record<string, unknown>;
  error?: string;
  updatedAt: string;
  /** Only present while the job is running and reporting. */
  progress?: BillingJobProgress;
}

function getJobDerivedStatus(job: {
  completedAt?: string | null;
  hasError?: boolean | null;
}): BillingJobStatus {
  if (job.hasError === true) return BillingJobStatus.Failed;
  if (typeof job.completedAt === 'string' && job.completedAt.length > 0)
    return BillingJobStatus.Success;
  return BillingJobStatus.Pending;
}

function getJobErrorMessage(job: {
  hasError?: boolean | null;
  error?: unknown;
}): string | undefined {
  if (job.hasError !== true) return undefined;
  const errorValue = job.error;
  if (errorValue !== undefined && errorValue !== null && typeof errorValue === 'object') {
    const errorRecord = errorValue as Record<string, unknown>;
    if (typeof errorRecord['message'] === 'string') {
      return errorRecord['message'];
    }
    return JSON.stringify(errorValue);
  }
  if (typeof errorValue === 'string') {
    return errorValue;
  }
  return 'Unknown error';
}

/**
 * GET /api/confidential/billing/sync-status – Get background job status for sync/generate/send tasks
 */
export const billingSyncStatusHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url ?? 'http://localhost');
    const queryParameters = {
      jobId: url.searchParams.get('jobId'),
    };
    const parseResult = SyncStatusQuerySchema.safeParse(queryParameters);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    const { jobId } = parseResult.data;

    if (typeof jobId === 'string' && jobId.length > 0) {
      const job = await request.payload.findByID({
        collection: 'payload-jobs',
        id: jobId,
        context: { internal: true },
      });

      const status = getJobDerivedStatus(job);
      const logs = Array.isArray(job.log) ? job.log : [];
      const output = selectTaskLogOutput(logs, job.taskSlug ?? '');
      const error = getJobErrorMessage(job);

      const jobData: SyncJobStatus = {
        id: job.id,
        taskSlug: job.taskSlug as BillingTaskSlug,
        status,
        updatedAt: job.updatedAt,
      };
      if (output !== undefined) {
        jobData.summary = output;
      }
      if (error !== undefined) {
        jobData.error = error;
      }

      return Response.json({
        success: true,
        job: jobData,
      });
    }

    // Otherwise, return the latest job for each task type
    const progressStore = new RedisJobProgressAdapter();
    const getLatestJob = async (taskSlug: BillingTaskSlug): Promise<SyncJobStatus | undefined> => {
      const result = await request.payload.find({
        collection: 'payload-jobs',
        where: buildLatestJobWhere(taskSlug, new Date()),
        sort: '-createdAt',
        limit: 1,
        context: { internal: true },
      });
      const job = result.docs[0];
      if (!job) return undefined;

      const status = getJobDerivedStatus(job);
      const logs = Array.isArray(job.log) ? job.log : [];
      const output = selectTaskLogOutput(logs, taskSlug);
      const error = getJobErrorMessage(job);

      const jobData: SyncJobStatus = {
        id: job.id,
        taskSlug,
        status,
        updatedAt: job.updatedAt,
      };
      if (output !== undefined) {
        jobData.summary = output;
      }
      if (error !== undefined) {
        jobData.error = error;
      }

      if (status === BillingJobStatus.Pending) {
        // Only trust a progress record that belongs to this job — a crashed run can
        // leave one behind until its TTL expires.
        const progress = await progressStore.read(taskSlug);
        if (progress?.jobId === job.id) {
          jobData.progress = progress;
        }
      }

      return jobData;
    };

    const [syncJob, generateJob, sendJob, pendingSend] = await Promise.all([
      getLatestJob(BillingTaskSlug.SyncParticipants),
      getLatestJob(BillingTaskSlug.GenerateBills),
      getLatestJob(BillingTaskSlug.SendBills),
      // How many invoices a "Mails versenden" click would actually put in the post right
      // now. The confirmation dialog states the number, because "send the bills" and
      // "email 1'274 people" are not the same decision.
      request.payload.count({
        collection: 'bill-participants',
        where: { status: { equals: 'bill_created' } },
        context: { internal: true },
      }),
    ]);

    return Response.json({
      success: true,
      sync: syncJob,
      generate: generateJob,
      send: sendJob,
      pendingSendCount: pendingSend.totalDocs,
      // Lets the toolbar disable what the server would refuse anyway, instead of
      // offering an action that fails only once it has been confirmed.
      capabilities: {
        regenerateAll: environmentVariables.BILLING_ALLOW_REGENERATE_ALL,
        // `registration-management` is hidden from the admin unless its feature flag is
        // on, and Payload 404s a hidden global — so a link to it is only worth
        // rendering where the page exists.
        availableDocuments: [
          'billSettings',
          'hoefe',
          ...(environmentVariables.FEATURE_ENABLE_REGISTRATION_MANAGEMENT
            ? ['registrationManagement']
            : []),
        ],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Fetch sync status failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

const CancelTaskSchema = z.object({
  task: z.enum([
    BillingTaskSlug.SyncParticipants,
    BillingTaskSlug.GenerateBills,
    BillingTaskSlug.SendBills,
  ]),
});

/**
 * POST /api/confidential/billing/cancel – Ask a running billing job to stop.
 *
 * Cancellation is cooperative: the flag is picked up at the next item boundary, so the
 * item in flight still finishes and the job reports the partial counters it reached.
 * Nothing already written is rolled back.
 */
export const billingCancelHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json?.();
    const parseResult = CancelTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    await new RedisJobProgressAdapter().requestCancel(parseResult.data.task);
    request.payload.logger.info(
      `Cancellation requested for billing task ${parseResult.data.task}.`,
    );

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Cancelling billing job failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};
