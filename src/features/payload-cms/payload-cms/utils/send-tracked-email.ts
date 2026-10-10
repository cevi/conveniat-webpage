import { environmentVariables } from '@/config/environment-variables';
import {
  recipientAddresses,
  splitSuppressedRecipients,
  suppressedReason,
} from '@/features/payload-cms/payload-cms/utils/email-suppression';
import type { Payload } from 'payload';

export type SendEmailOptions = Parameters<Payload['sendEmail']>[0];

/**
 * What became of one tracked mail.
 *
 * An SMTP failure is recorded on the `outgoing-emails` row and does not throw, so a
 * caller that needs to know whether the mail actually left has to read this. The same
 * goes for a mail that was withheld because every recipient is suppressed.
 */
export interface TrackedEmailResult {
  success: boolean;
  outgoingEmailId: string;
  /** The SMTP error, when there was one. */
  error?: string;
}

export const sendTrackedEmail = async (
  payload: Payload,
  emailOptions: SendEmailOptions,
  formSubmissionId?: string,
  /** One participation, or the several a reminder to a Hof's Adressverwalter covers. */
  billParticipantId?: string | string[],
  existingOutgoingEmailId?: string,
): Promise<TrackedEmailResult> => {
  const options = emailOptions as unknown as {
    to?: string | string[];
    cc?: unknown;
    bcc?: unknown;
    subject?: string;
    html?: string;
    text?: string;
  };
  let to = 'unknown';

  if (typeof options.to === 'string') {
    to = options.to;
  } else if (Array.isArray(options.to)) {
    to = options.to.join(', ');
  }

  const subject = options.subject ?? 'No Subject';

  let outgoingEmailId = existingOutgoingEmailId;

  if (!outgoingEmailId) {
    // 1. Create the outgoing-emails record first
    const data: {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      formSubmission?: string;
      billParticipant?: string;
      billParticipants?: string[];
      deliveryStatus: 'pending' | 'success' | 'error';
    } = {
      to,
      subject,
      ...(options.html === undefined ? {} : { html: options.html }),
      // Billing mails and the Pflichtangaben reminders are plain text only; without this
      // their record shows no content and a resend goes out empty.
      ...(options.text === undefined ? {} : { text: options.text }),
      deliveryStatus: 'pending',
    };

    if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
      data.formSubmission = formSubmissionId;
    }
    if (typeof billParticipantId === 'string' && billParticipantId.length > 0) {
      data.billParticipant = billParticipantId;
    } else if (Array.isArray(billParticipantId) && billParticipantId.length > 0) {
      data.billParticipants = billParticipantId;
    }

    try {
      const outgoingEmailDocument = await payload.create({
        collection: 'outgoing-emails',
        data,
      });
      outgoingEmailId = outgoingEmailDocument.id;
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: 'Failed to create outgoing-emails record before sending email.',
      });
      // Even if it fails, we shouldn't necessarily crash the email sending, but we can't track it properly with DSN without an ID.
      // We'll proceed sending it without DSN tracking ID just to be safe it sends, or we can throw. Throwing is safer for ensuring tracking.
      throw new Error(`Could not create outgoing email record: ${String(error)}`);
    }
  }

  // 2. Send the email with DSN tracking, to everyone who has not bounced for good before
  let deliverable: string[] = [];
  let copies: { cc?: string[]; bcc?: string[] } = {};
  let suppressed: string[] = [];
  let isWithheld = false;

  let success = false;
  let responseOrError: unknown;

  try {
    // Inside the catch on purpose: a mail whose recipients could not be checked is not
    // sent, and its row has to say so rather than stay `pending`.
    // Copies count too: an address that must get no mail must not get it as a copy either.
    const everyone = await splitSuppressedRecipients(payload, [
      options.to,
      options.cc,
      options.bcc,
    ]);
    ({ suppressed } = everyone);
    const allowed = (field: unknown): string[] =>
      recipientAddresses(field).filter((address) => !suppressed.includes(address));
    deliverable = allowed(options.to);
    copies = {
      ...(options.cc !== undefined && { cc: allowed(options.cc) }),
      ...(options.bcc !== undefined && { bcc: allowed(options.bcc) }),
    };
    isWithheld = suppressed.length > 0 && everyone.deliverable.length === 0;

    if (isWithheld) {
      // Not logged as an error: this is the list doing its job, and the row says why.
      responseOrError = suppressedReason(suppressed);
    } else {
      responseOrError = await payload.sendEmail({
        ...emailOptions,
        ...(suppressed.length > 0 ? { to: deliverable, ...copies } : {}),
        ...(typeof environmentVariables.SMTP_USER === 'string' &&
        environmentVariables.SMTP_USER.length > 0
          ? {
              dsn: {
                id: String(outgoingEmailId),
                return: 'headers',
                // No `recipient`: that is the ORCPT a server echoes back as the original
                // recipient, not the address the report is sent to. Reports go to the
                // envelope sender anyway.
                notify: ['success', 'failure', 'delay'],
              },
            }
          : {}),
      });
      success = true;
    }
  } catch (error: unknown) {
    success = false;
    responseOrError = error instanceof Error ? error.message : String(error);
    payload.logger.error({
      err: error,
      msg: `Error while sending tracked email to address: ${to}. Email not sent.`,
    });
  }
  const isPartlyWithheld = suppressed.length > 0 && !isWithheld;

  // 3. Prepare the SMTP result
  const smtpResult: Record<string, unknown> = {
    success,
    to: isPartlyWithheld ? deliverable.join(', ') : to,
    // A resend reuses this mail's id. The time tells its reports apart from this send's.
    sentAt: new Date().toISOString(),
  };
  // When the mail still went to the others, the ones left out get an entry of their own.
  const newResults = isPartlyWithheld
    ? [
        { success: false, to: suppressed.join(', '), error: suppressedReason(suppressed) },
        smtpResult,
      ]
    : [smtpResult];

  if (success) {
    smtpResult['response'] = responseOrError;
  } else {
    smtpResult['error'] = responseOrError;
  }

  // 4. Update the outgoing-email record with the SMTP result
  try {
    const existing = (await payload.findByID({
      collection: 'outgoing-emails',
      id: outgoingEmailId,
    })) as { smtpResults?: unknown[] };
    const results = Array.isArray(existing.smtpResults) ? [...existing.smtpResults] : [];
    results.push(...newResults);

    await payload.update({
      collection: 'outgoing-emails',
      id: outgoingEmailId,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        deliveryStatus: success ? 'success' : 'error',
        smtpReceivedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Failed to update outgoing-emails record ${outgoingEmailId} with smtp results.`,
    });
  }

  // 5. If this is linked to a form submission, update its SMTP results as well
  if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
    try {
      const submission = (await payload.findByID({
        collection: 'form-submissions',
        id: formSubmissionId,
      })) as { smtpResults?: unknown[] };

      const subResults = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];
      subResults.push(...newResults);

      await payload.update({
        collection: 'form-submissions',
        id: formSubmissionId,
        data: {
          smtpResults: subResults,
        },
      });
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: `Failed to update form-submissions record ${formSubmissionId} with smtp results.`,
      });
    }
  }

  return {
    success,
    outgoingEmailId: String(outgoingEmailId),
    ...(success ? {} : { error: String(responseOrError) }),
  };
};
