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

export const updateTrackingRecords = async (
  payload: Payload,
  envelopeId: string,
  isSuccess: boolean,
  dsnString: string,
  rawEmail: string,
  recipientEmail?: string,
): Promise<boolean> => {
  let outgoingEmail:
    | {
        smtpResults?: unknown[];
        formSubmission?: string | { id: string };
        rawDsnEmail?: string;
        to?: string;
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
  if (typeof recipientEmail === 'string' && recipientEmail.length > 0) {
    toAddress = recipientEmail;
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

    await payload.update({
      collection: 'outgoing-emails',
      id: envelopeId,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        rawDsnEmail: newRawDsnEmail,
        deliveryStatus: isSuccess ? 'success' : 'error',
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
