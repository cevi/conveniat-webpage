import { environmentVariables } from '@/config/environment-variables';
import { RedisRunLockAdapter } from '@/features/billing/adapters/redis-run-lock.adapter';
import type { JobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import type { SendSummary } from '@/features/billing/types';
import { BillingTaskSlug } from '@/features/billing/types';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

/** How long a send run may hold its lock before it is assumed dead. */
const RUN_LOCK_TTL_SECONDS = 2 * 60 * 60;

interface SyncHistoryEntry {
  date: string;
  action: string;
}

/**
 * Sends QR Bill PDFs via email to all participants with status 'bill_created'.
 *
 * Uses Payload's built-in email transport (configured via emailSettings in payload.config.ts)
 * instead of importing nodemailer directly, to avoid bundler resolution issues.
 */
export async function sendBills(
  payload: Payload,
  participantId?: string,
  dependencies?: { s3Client?: S3Client },
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
    await result.lock.release();
  }
}

async function sendBillsLocked(
  payload: Payload,
  participantId: string | undefined,
  dependencies: { s3Client?: S3Client } | undefined,
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
      endpoint: environmentVariables.MINIO_HOST,
      region: 'us-east-1',
      credentials: {
        accessKeyId: environmentVariables.MINIO_ACCESS_KEY_ID,
        secretAccessKey: environmentVariables.MINIO_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

  for (const [index, document_] of participants.docs.entries()) {
    await reporter?.report({
      processedItems: index,
      totalItems: participants.docs.length,
      currentItemName: String(document_.fullName),
      runningSummary: { sentCount: summary.sentCount, failedCount: summary.failedCount },
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
        Bucket: environmentVariables.MINIO_BUCKET_NAME,
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

      // Send email via Payload's built-in transport, tracked in outgoing-emails
      await sendTrackedEmail(
        payload,
        {
          to: email,
          subject: emailSubject,
          text: emailBody,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- nodemailer attachment type
          attachments: [
            {
              filename: `rechnung-${(document_.invoiceNumber as string | undefined) ?? 'bill'}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nodemailer attachment type
          ] as any,
        },
        undefined, // no form submission
        String(document_.id),
      );

      const isReminderSent = document_.status === 'reminder_sent';
      const newStatus = isReminderSent ? 'reminder_sent' : 'bill_sent';

      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      await payload.update({
        collection: 'bill-participants',
        context: { internal: true },
        id: document_.id,
        data: {
          status: newStatus,
          billSentDate: new Date().toISOString(),
          syncHistory: [
            ...history,
            { date: new Date().toISOString(), action: `bill_sent_to_${email}` },
          ],
        },
      });

      summary.sentCount++;
    } catch (error) {
      summary.errors.push(
        `Participant ${String(document_.id)} (${String(document_.fullName)}): ${String(error)}`,
      );
      summary.failedCount++;
    }
  }

  payload.logger.info(
    `Email send complete: ${String(summary.sentCount)} sent, ${String(summary.failedCount)} failed`,
  );
  return summary;
}
