import { environmentVariables } from '@/config/environment-variables';
import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { RedisRunLockAdapter } from '@/features/billing/adapters/redis-run-lock.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import { writeBackAnmeldestatus } from '@/features/billing/services/anmeldestatus-writeback';
import { BILL_MAIL_PENDING } from '@/features/billing/services/bill-mail-status';
import type { JobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import type { SendSummary } from '@/features/billing/types';
import { BillingTaskSlug } from '@/features/billing/types';
import {
  discardQueuedEmailsFor,
  queueBackgroundEmail,
} from '@/features/payload-cms/payload-cms/utils/email-outbox';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import { HITOBITO_CONFIG } from '@/lib/hitobito';
import { BILL_PDF_BUCKET_NAME } from '@/lib/s3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

/** How long a send run may hold its lock before it is assumed dead. */
const RUN_LOCK_TTL_SECONDS = 2 * 60 * 60;

interface SyncHistoryEntry {
  date: string;
  action: string;
  /** The value written back to the Cevi.DB. */
  value?: string;
  /** Why a step after the send failed, for the operator reading the row. */
  reviewReason?: string;
}

/** What `sendBills` lets a test replace. */
interface SendBillsDependencies {
  s3Client?: S3Client;
  hitobitoService?: HitobitoServicePort;
}

/**
 * Sends QR Bill PDFs via email to all participants with status 'bill_created'.
 *
 * The bulk run does not send: it puts every bill into the outgoing mail queue, which lets
 * them out at the rate the mail server tolerates, and leaves the rows in
 * `bill_mail_pending` until their mail has left. A single bill an operator asks for by
 * `participantId` is sent on the spot.
 *
 * Uses Payload's built-in email transport (configured via emailSettings in payload.config.ts)
 * instead of importing nodemailer directly, to avoid bundler resolution issues.
 */
export async function sendBills(
  payload: Payload,
  participantId?: string,
  dependencies?: SendBillsDependencies,
  reporter?: JobProgressReporter,
  /** Identifies the run. Queued tasks pass their job id; see `RunLockPort`. */
  runOwner?: string,
): Promise<SendSummary> {
  // Both routes into sending — the queued task and the per-row "Email senden" — come
  // through here. Two overlapping runs would each pick up the same `bill_created` rows
  // and mail the same invoice twice before either had written `bill_sent` back.
  const { classifyLockConflict } = await import('@/features/billing/ports/run-lock.port');

  const owner = runOwner ?? `request:${randomUUID()}`;
  const result = await new RedisRunLockAdapter().acquire(
    BillingTaskSlug.SendBills,
    RUN_LOCK_TTL_SECONDS,
    owner,
  );

  if (!result.acquired) {
    if (classifyLockConflict(result.heldBy, owner) === 'duplicate-worker') {
      // The same queued job, picked up by both replicas. The other worker is sending.
      payload.logger.info(
        `Bill sending for job ${owner} is already running on another worker; skipping this duplicate execution.`,
      );
      return { sentCount: 0, failedCount: 0, duplicate: true, errors: [] };
    }

    payload.logger.warn(
      `Refused to start bill sending for ${owner}: run ${result.heldBy ?? 'unknown'} holds the lock.`,
    );
    return {
      sentCount: 0,
      failedCount: 0,
      errors: ['Es läuft bereits ein Versand. Bitte warte, bis dieser abgeschlossen ist.'],
    };
  }

  try {
    return await sendBillsLocked(payload, participantId, dependencies, reporter);
  } finally {
    // Inside the lock on purpose: only the execution that acquired it owns the progress
    // record, and the keys are scoped by task slug rather than by job.
    await reporter?.finish();
    await result.lock.release();
  }
}

async function sendBillsLocked(
  payload: Payload,
  participantId: string | undefined,
  dependencies: SendBillsDependencies | undefined,
  reporter: JobProgressReporter | undefined,
): Promise<SendSummary> {
  const summary: SendSummary = {
    sentCount: 0,
    failedCount: 0,
    errors: [],
  };

  // 1. Load bill settings for email template
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  const emailSubject =
    (settings.invoiceEmailSubject as string | undefined) ??
    'conveniat27 – Anmeldebestätigung und Rechnung';
  const emailBodyTemplate =
    (settings.invoiceEmailBody as string | undefined) ??
    'Bitte finden Sie Ihre Rechnung im Anhang.';

  // 2. Query participants needing email
  // Note: When participantId is provided (e.g., admin clicking "Email senden" in the UI),
  // we intentionally bypass the 'bill_created' status check to allow force-resending bills.
  const whereClause = participantId
    ? { id: { equals: participantId } }
    : { status: { equals: 'bill_created' } };

  const participants = await payload.find({
    collection: 'bill-participants',
    context: { internal: true },
    where: whereClause,
    limit: 10_000,
  });

  if (participants.docs.length === 0) {
    payload.logger.info('No bills to send.');
    return summary;
  }

  // 3. Create S3 client once for all PDF fetches
  const s3 =
    dependencies?.s3Client ??
    new S3Client({
      endpoint: environmentVariables.S3_HOST,
      region: 'us-east-1',
      credentials: {
        accessKeyId: environmentVariables.S3_ACCESS_KEY_ID,
        secretAccessKey: environmentVariables.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

  // 4. The Cevi.DB write-back needs the same browser cookie the sync uses. Built once per
  // run; when it is missing the bills still go out and every row records why its
  // Anmeldestatus stayed behind.
  const hitobitoService = dependencies?.hitobitoService ?? (await createHitobitoService(payload));
  const writeBackLogger = {
    warn: (message: string): void => payload.logger.warn(message),
    debug: (message: string): void => payload.logger.debug(message),
  };

  for (const [index, document_] of participants.docs.entries()) {
    await reporter?.report({
      processedItems: index,
      totalItems: participants.docs.length,
      currentItemName: String(document_.fullName),
      runningSummary: {
        sentCount: summary.sentCount,
        queuedCount: summary.queuedCount ?? 0,
        failedCount: summary.failedCount,
      },
    });

    if (await reporter?.shouldCancel()) {
      summary.cancelled = true;
      payload.logger.info(
        `Bill sending cancelled by operator after ${String(index)} of ${String(participants.docs.length)} participants.`,
      );
      break;
    }

    try {
      const fullName = document_.fullName;
      const firstName = fullName.split(' ')[0] ?? fullName;
      const lastName = fullName.split(' ').slice(1).join(' ');
      const referenceNumber = (document_.referenceNumber as string | undefined) ?? '';
      const invoiceAmount = (document_.invoiceAmount as number | undefined) ?? 0;
      const pdfDocuments = (document_.billPdfs as (string | { id: string })[] | undefined) ?? [];
      const latestPdfId = pdfDocuments.at(-1);

      if (!latestPdfId) {
        summary.errors.push(`No PDF for participant ${String(document_.id)} (${fullName})`);
        summary.failedCount++;
        continue;
      }

      const pdfDocumentId = typeof latestPdfId === 'object' ? latestPdfId.id : latestPdfId;
      const pdfDocument = await payload.findByID({
        collection: 'bill-pdfs',
        id: pdfDocumentId,
        context: { internal: true },
      });

      if (!pdfDocument.filename) {
        summary.errors.push(
          `No PDF file found for participant ${String(document_.id)} (${fullName})`,
        );
        summary.failedCount++;
        continue;
      }

      const command = new GetObjectCommand({
        Bucket: BILL_PDF_BUCKET_NAME,
        Key: pdfDocument.filename,
      });

      const response = await s3.send(command);
      if (!response.Body) {
        summary.errors.push(`Empty PDF body for participant ${String(document_.id)} (${fullName})`);
        summary.failedCount++;
        continue;
      }

      const pdfBuffer = Buffer.from(await response.Body.transformToByteArray());

      // The bill goes to the address the participant gave *for the bill* — the
      // "Mailadresse für Rechnung" answer on the camp registration, which the sync stores
      // on `email`. It is deliberately not the Cevi.DB account address: for a minor that
      // is the child's own mailbox, while the registration answer is the one the parents
      // filled in precisely so the invoice would reach them.
      //
      // The answer is matched by question text upstream rather than by its id, because
      // Hitobito numbers the questions per event.
      const rawEmail = document_.email;
      const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

      if (email === '') {
        // Never silently fall back to the account address: that is the bug this replaced.
        // A registration without an invoice address is a Pflichtangabe gap, and the sync
        // already blocks such a row from being billed at all.
        summary.errors.push(
          `${fullName}: keine "Mailadresse für Rechnung" hinterlegt – Rechnung nicht versendet.`,
        );
        summary.failedCount++;
        continue;
      }

      // Prepare email body from template
      const emailBody = emailBodyTemplate
        .replaceAll('{{firstName}}', firstName)
        .replaceAll('{{lastName}}', lastName)
        .replaceAll('{{fullName}}', fullName)
        .replaceAll('{{amount}}', String(invoiceAmount))
        .replaceAll('{{reference}}', referenceNumber);

      const billMail = {
        to: email,
        subject: emailSubject,
        text: emailBody,
        attachments: [
          {
            filename: `rechnung-${(document_.invoiceNumber as string | undefined) ?? 'bill'}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      // A mail for this bill may still be waiting from an earlier run, carrying the PDF
      // of a bill that has since been replaced. The one written now is the one to send.
      await discardQueuedEmailsFor(
        payload,
        String(document_.id),
        'replaced by a newer mail for this registration',
      );

      const isQueued = participantId === undefined;
      await (isQueued
        ? queueBackgroundEmail(payload, billMail, String(document_.id))
        : sendTrackedEmail(payload, billMail, undefined, String(document_.id)));

      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      let historyAfterSend: SyncHistoryEntry[];
      if (isQueued) {
        // `bill_sent` and the send date follow when the mail leaves the queue; see
        // `markBillMailSent`.
        historyAfterSend = [
          ...history,
          { date: new Date().toISOString(), action: `bill_queued_for_${email}` },
        ];
        await payload.update({
          collection: 'bill-participants',
          context: { internal: true },
          id: document_.id,
          data: { status: BILL_MAIL_PENDING, syncHistory: historyAfterSend },
        });
        summary.queuedCount = (summary.queuedCount ?? 0) + 1;
      } else {
        historyAfterSend = [
          ...history,
          { date: new Date().toISOString(), action: `bill_sent_to_${email}` },
        ];
        await payload.update({
          collection: 'bill-participants',
          context: { internal: true },
          id: document_.id,
          data: {
            status: document_.status === 'reminder_sent' ? 'reminder_sent' : 'bill_sent',
            billSentDate: new Date().toISOString(),
            syncHistory: historyAfterSend,
          },
        });
        summary.sentCount++;
      }

      // The bill is on its way, so the Cevi.DB has to read "Rechnung gestellt" — already
      // for a queued one, which leaves within hours or days. A row that is
      // already there, or that the Anmeldeverantwortliche has closed as "definitiv", is
      // left alone — a write-back must never move a registration backwards.
      const writeBack = await writeBackAnmeldestatus(
        hitobitoService,
        {
          groupId: document_.groupId ?? '',
          eventId: document_.eventId,
          participationUuid: document_.participationUuid,
          fullName,
          anmeldestatus: document_.anmeldestatus,
        },
        new Date().toISOString(),
        writeBackLogger,
      );

      if (writeBack.error !== undefined) {
        summary.errors.push(writeBack.error);
        // The operator can only fix a cookie in one place, so link them to it.
        if (writeBack.cookieInvalid === true) summary.relatedDocuments = ['registrationManagement'];
      }

      if (
        writeBack.historyEntries.length > 0 ||
        writeBack.anmeldestatus !== document_.anmeldestatus
      ) {
        await payload.update({
          collection: 'bill-participants',
          context: { internal: true },
          id: document_.id,
          data: {
            // Left out entirely when there is nothing to store, so the column keeps
            // whatever it held.
            ...(writeBack.anmeldestatus === undefined
              ? {}
              : { anmeldestatus: writeBack.anmeldestatus }),
            syncHistory: [...historyAfterSend, ...writeBack.historyEntries],
          },
        });
      }
    } catch (error) {
      summary.errors.push(
        `Participant ${String(document_.id)} (${String(document_.fullName)}): ${String(error)}`,
      );
      summary.failedCount++;
    }
  }

  payload.logger.info(
    `Email send complete: ${String(summary.sentCount)} sent, ${String(summary.queuedCount ?? 0)} queued, ${String(summary.failedCount)} failed`,
  );
  return summary;
}

/**
 * The Cevi.DB client for a send run, or `undefined` when no browser cookie is configured.
 * Built exactly like the sync builds it.
 */
async function createHitobitoService(payload: Payload): Promise<HitobitoServicePort | undefined> {
  const regManagement = await payload.findGlobal({
    slug: 'registration-management',
    context: { internal: true },
  });
  const browserCookie = (regManagement.browserCookie ?? '').trim();
  if (browserCookie === '') return undefined;

  return new HitobitoServiceAdapter(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie,
    },
    {
      info: (message: string): void => payload.logger.info(message),
      warn: (message: string): void => payload.logger.warn(message),
      error: (message: string): void => payload.logger.error(message),
    },
  );
}
