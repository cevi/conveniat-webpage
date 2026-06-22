import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import { S3StorageAdapter } from '@/features/billing/adapters/s3-storage.adapter';
import { populateSubeventsUseCase } from '@/features/billing/services/populate-subevents';
import { previewPdfUseCase } from '@/features/billing/services/preview-pdf';
import { BillingJobStatus, BillingTaskSlug } from '@/features/billing/types';
import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { PayloadHandler } from 'payload';
import { z } from 'zod';

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
 * POST /api/confidential/billing/populate-subevents – Dynamically fetch subevents of group 4337 and save to settings
 */
export const billingPopulateSubeventsHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessBilling({ req: request });
    if (hasAccess !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsRepo = new PayloadSettingsAdapter(request.payload);
    const regManagement = await settingsRepo.getRegistrationManagement();
    const cookieValue = regManagement.browserCookie;
    const browserCookie =
      typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

    const logger = {
      info: (m: string): void => request.payload.logger.info(m),
      warn: (m: string): void => request.payload.logger.warn(m),
      error: (m: string): void => request.payload.logger.error(m),
    };

    const hitobitoService = new HitobitoServiceAdapter(
      {
        baseUrl: HITOBITO_CONFIG.baseUrl,
        apiToken: HITOBITO_CONFIG.apiToken,
        browserCookie,
      },
      logger,
    );

    const result = await populateSubeventsUseCase(hitobitoService, settingsRepo, logger);
    return Response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Populating subevents failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

interface SyncJobStatus {
  id: string;
  taskSlug: BillingTaskSlug;
  status: BillingJobStatus;
  summary?: Record<string, unknown>;
  error?: string;
  updatedAt: string;
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
      const taskLog = logs.find((l) => l.taskSlug === job.taskSlug);
      const output = taskLog?.output as Record<string, unknown> | undefined;
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
    const getLatestJob = async (taskSlug: BillingTaskSlug): Promise<SyncJobStatus | undefined> => {
      const result = await request.payload.find({
        collection: 'payload-jobs',
        where: {
          taskSlug: { equals: taskSlug },
        },
        sort: '-createdAt',
        limit: 1,
        context: { internal: true },
      });
      const job = result.docs[0];
      if (!job) return undefined;

      const status = getJobDerivedStatus(job);
      const logs = Array.isArray(job.log) ? job.log : [];
      const taskLog = logs.find((l) => l.taskSlug === (taskSlug as string));
      const output = taskLog?.output as Record<string, unknown> | undefined;
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

      return jobData;
    };

    const [syncJob, generateJob, sendJob] = await Promise.all([
      getLatestJob(BillingTaskSlug.SyncParticipants),
      getLatestJob(BillingTaskSlug.GenerateBills),
      getLatestJob(BillingTaskSlug.SendBills),
    ]);

    return Response.json({
      success: true,
      sync: syncJob,
      generate: generateJob,
      send: sendJob,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Fetch sync status failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};
