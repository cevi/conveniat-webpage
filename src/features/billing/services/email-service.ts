import { environmentVariables } from '@/config/environment-variables';
import type { SendSummary } from '@/features/billing/types';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { PersonService } from '@/features/registration_process/hitobito-api/services/person.service';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Payload } from 'payload';

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
export async function sendBills(payload: Payload, participantId?: string): Promise<SendSummary> {
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

  // 2. Create Hitobito client for fetching person email addresses
  const logger = {
    info: (message: string): void => {
      payload.logger.info(message);
    },
    warn: (message: string): void => {
      payload.logger.warn(message);
    },
    error: (message: string): void => {
      payload.logger.error(message);
    },
  };

  const client = new HitobitoClient(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie: '',
    },
    logger,
  );
  const personService = new PersonService(client, logger);

  // 3. Query participants needing email
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

  for (const document_ of participants.docs) {
    try {
      const userId = document_.userId;
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

      const s3 = new S3Client({
        endpoint: environmentVariables.MINIO_HOST,
        region: 'us-east-1',
        credentials: {
          accessKeyId: environmentVariables.MINIO_ACCESS_KEY_ID,
          secretAccessKey: environmentVariables.MINIO_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true,
      });

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

      // Fetch email from Cevi.DB
      const personResult = await personService.getDetails({ personId: userId });
      const email = personResult.success ? personResult.attributes?.email : undefined;

      if (!email) {
        summary.errors.push(`No email for participant ${String(document_.id)} (${fullName})`);
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
