import type { RecipientBounce } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/email-parser';
import { applyDeliveryReport } from '@/features/payload-cms/payload-cms/utils/email-suppression';
import type { Payload } from 'payload';

const MAX_RAW_EMAIL_LENGTH = 20_000;
const MAX_TOTAL_DSN_EMAIL_LENGTH = 39_000;

/**
 * Whether a Payload error means the document does not exist, rather than that the lookup
 * itself failed.
 *
 * The caller stops reading a notification for good once this module reports no match, so
 * "the database blinked" must never be read as "this is not ours". Checked by HTTP status
 * rather than by class or by `name`: the Next build minifies class names, and `this.name =
 * this.constructor.name` does not survive that.
 *
 * @param error - The error a Payload lookup threw.
 * @returns True when the lookup ran and found nothing.
 */
const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === 404;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRetriggered = (result: unknown): boolean =>
  isRecord(result) && result['retriggeredBy'] !== undefined;

const isBounce = (result: unknown): boolean =>
  isRecord(result) &&
  result['bounceReport'] === true &&
  typeof result['error'] === 'string' &&
  /^Action:\s*failed/im.test(result['error']);

const textOf = (result: Record<string, unknown>): string => {
  if (typeof result['error'] === 'string') return result['error'];
  const response = result['response'];
  return isRecord(response) && typeof response['response'] === 'string' ? response['response'] : '';
};

// The ways a server names the id it gave the message: in its answer to the server before it,
// and in the header of its own report.
const HOP_ID = /(?:queued as|X-Original-ID:|X-Postfix-Queue-ID:)\s*([\w-]{8,})/gi;

/**
 * When the send a report is about left our server.
 *
 * A resend reuses the id of the mail, so the id alone does not say which send a report
 * belongs to, and a bounce of the first send can be read after the resend. The report quotes
 * the queue id our server gave that send. A server further down the line quotes its own id
 * instead, which an earlier hand-off report of the same send ties to ours. A report that
 * quotes neither counts for the latest send.
 *
 * @param results - The delivery log of the mail, the report itself included.
 * @param dsnString - The text of the report.
 * @param firstSentAt - When the mail was created, for sends stored without a time.
 */
const sentAtOfReport = (
  results: unknown[],
  dsnString: string,
  firstSentAt: string | null | undefined,
): number => {
  const sends = results.filter(
    (result): result is Record<string, unknown> =>
      isRecord(result) &&
      result['bounceReport'] !== true &&
      result['manualOverride'] !== true &&
      result['success'] === true,
  );
  const reports = results
    .filter(
      (result): result is Record<string, unknown> =>
        isRecord(result) && result['bounceReport'] === true,
    )
    .map((report) => textOf(report));
  const hopIds = [...dsnString.matchAll(HOP_ID)].map((match) => match[1] as string);

  const isQuoted = (send: Record<string, unknown>): boolean => {
    const queueId = /queued as\s+([\w-]+)/i.exec(textOf(send))?.[1];
    if (queueId === undefined) return false;
    if (dsnString.includes(queueId)) return true;
    return reports.some(
      (report) => report.includes(queueId) && hopIds.some((hopId) => report.includes(hopId)),
    );
  };

  const quoted = sends.findLastIndex((send) => isQuoted(send));
  const index = quoted === -1 ? sends.length - 1 : quoted;
  const send = sends[index];
  const stored = send?.['sentAt'] ?? send?.['retriggeredAt'] ?? (index <= 0 ? firstSentAt : '');
  const sentAt = Date.parse(typeof stored === 'string' ? stored : '');
  return Number.isNaN(sentAt) ? Date.now() : sentAt;
};

export const updateTrackingRecords = async (
  payload: Payload,
  envelopeId: string,
  isSuccess: boolean,
  dsnString: string,
  rawEmail: string,
  /** What the notification says happened to each recipient it covers. */
  bounces: Pick<RecipientBounce, 'email' | 'action' | 'status'>[] = [],
): Promise<boolean> => {
  let outgoingEmail:
    | {
        smtpResults?: unknown[];
        formSubmission?: string | { id: string };
        rawDsnEmail?: string;
        to?: string;
        smtpReceivedAt?: string | null;
        createdAt?: string | null;
      }
    | undefined;

  try {
    outgoingEmail = (await payload.findByID({
      collection: 'outgoing-emails',
      id: envelopeId,
    })) as typeof outgoingEmail;
  } catch (error: unknown) {
    // No such row is the normal case: the id may be a form-submission id, which the fallback
    // below covers. Anything else has to reach the caller so the message is read again.
    if (!isNotFound(error)) throw error;
  }

  let toAddress = 'unknown';
  // One stored result per notification, naming every recipient it covers.
  const covered = bounces
    .map((bounce) => bounce.email)
    .filter((email): email is string => typeof email === 'string' && email.length > 0);
  if (covered.length > 0) {
    toAddress = covered.join(', ');
  } else if (typeof outgoingEmail?.to === 'string' && outgoingEmail.to.length > 0) {
    toAddress = outgoingEmail.to;
  }

  const newResult: Record<string, unknown> = {
    bounceReport: true,
    receivedAt: new Date().toISOString(),
    success: isSuccess,
    to: toAddress,
  };

  if (isSuccess) {
    newResult['response'] = { response: dsnString };
  } else {
    newResult['error'] = dsnString;
  }

  if (outgoingEmail === undefined) {
    // Fallback: it might be an old email tracking ID (form submission ID directly)
    let submission: { smtpResults?: unknown[] };

    try {
      submission = (await payload.findByID({
        collection: 'form-submissions',
        id: envelopeId,
      })) as { smtpResults?: unknown[] };
    } catch (error: unknown) {
      if (!isNotFound(error)) throw error;

      // Fires per scanned message on every bounce check, on every replica, and says
      // nothing actionable — the per-run summary already reports the ignored count.
      payload.logger.debug({
        msg: `Bounce tracking ID ${envelopeId} not found, likely belongs to another instance`,
      });
      return false;
    }

    const subResults = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];
    subResults.push(newResult);

    await payload.update({
      collection: 'form-submissions',
      id: envelopeId,
      data: { smtpResults: subResults },
    });
    return true;
  } else {
    const results = Array.isArray(outgoingEmail.smtpResults) ? [...outgoingEmail.smtpResults] : [];
    results.push(newResult);

    const currentRawEmail = String(rawEmail);
    const croppedRawEmail =
      currentRawEmail.length > MAX_RAW_EMAIL_LENGTH
        ? currentRawEmail.slice(0, MAX_RAW_EMAIL_LENGTH) + '\n... [truncated]'
        : currentRawEmail;

    let newRawDsnEmail =
      typeof outgoingEmail.rawDsnEmail === 'string' && outgoingEmail.rawDsnEmail.length > 0
        ? `${croppedRawEmail}\n\n---\n\n${outgoingEmail.rawDsnEmail}`
        : croppedRawEmail;

    if (newRawDsnEmail.length > MAX_TOTAL_DSN_EMAIL_LENGTH) {
      newRawDsnEmail =
        newRawDsnEmail.slice(0, MAX_TOTAL_DSN_EMAIL_LENGTH) + '\n... [truncated early bounces] ...';
    }

    // Reports arrive per hop and per recipient, in mailbox order. A success report read after
    // a bounce is the relay confirming a hand-off or another recipient being reached, so it
    // must not clear the bounce. Only a `failed` report of the current attempt counts: a
    // `delayed` one is temporary, and a resend or a manual override starts over.
    const lastReset = results.findLastIndex((result) => isRetriggered(result));
    const hasBounced = !isSuccess || results.slice(lastReset + 1).some((r) => isBounce(r));

    // Reports are placed by when their send left, not by when they are read.
    const sentAt = sentAtOfReport(
      results,
      dsnString,
      outgoingEmail.createdAt ?? outgoingEmail.smtpReceivedAt,
    );
    for (const bounce of bounces) {
      await applyDeliveryReport(payload, { id: envelopeId, to: outgoingEmail.to, sentAt }, bounce);
    }

    await payload.update({
      collection: 'outgoing-emails',
      id: envelopeId,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        rawDsnEmail: newRawDsnEmail,
        deliveryStatus: hasBounced ? 'error' : 'success',
        dsnReceivedAt: new Date().toISOString(),
      },
    });

    const formSubmissionRelated = outgoingEmail.formSubmission;
    const formSubmissionId =
      typeof formSubmissionRelated === 'string'
        ? formSubmissionRelated
        : (formSubmissionRelated as { id?: string } | undefined)?.id;

    if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
      try {
        const submission = (await payload.findByID({
          collection: 'form-submissions',
          id: formSubmissionId,
        })) as { smtpResults?: unknown[] };

        const subResults = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];
        subResults.push(newResult);

        await payload.update({
          collection: 'form-submissions',
          id: formSubmissionId,
          data: { smtpResults: subResults },
        });
      } catch (error: unknown) {
        payload.logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: `Failed to update form-submission ${formSubmissionId} for bounce`,
        });
      }
    }
    return true;
  }
};
