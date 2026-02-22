import { environmentVariables } from '@/config/environment-variables';
import type { Payload } from 'payload';

export type SendEmailOptions = Parameters<Payload['sendEmail']>[0];

export const sendTrackedEmail = async (
  payload: Payload,
  emailOptions: SendEmailOptions,
  formSubmissionId?: string,
): Promise<void> => {
  const options = emailOptions as unknown as { to?: string | string[]; subject?: string };
  let to = 'unknown';

  if (typeof options.to === 'string') {
    to = options.to;
  } else if (Array.isArray(options.to)) {
    to = options.to.join(', ');
  }

  const subject = options.subject ?? 'No Subject';

  // 1. Create the outgoing-emails record first
  const data: {
    to: string;
    subject: string;
    formSubmission?: string;
  } = {
    to,
    subject,
  };

  if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
    data.formSubmission = formSubmissionId;
  }

  let outgoingEmailDocument;
  try {
    outgoingEmailDocument = await payload.create({
      collection: 'outgoing-emails',
      data,
    });
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: 'Failed to create outgoing-emails record before sending email.',
    });
    // Even if it fails, we shouldn't necessarily crash the email sending, but we can't track it properly with DSN without an ID.
    // We'll proceed sending it without DSN tracking ID just to be safe it sends, or we can throw. Throwing is safer for ensuring tracking.
    throw new Error(`Could not create outgoing email record: ${String(error)}`);
  }

  const outgoingEmailId = outgoingEmailDocument.id;

  // 2. Send the email with DSN tracking
  let success = false;
  let responseOrError: unknown;

  try {
    const emailPromise = await payload.sendEmail({
      ...emailOptions,
      ...(typeof environmentVariables.SMTP_USER === 'string' &&
      environmentVariables.SMTP_USER.length > 0
        ? {
            dsn: {
              id: String(outgoingEmailId),
              return: 'headers',
              notify: ['success', 'failure', 'delay'],
              recipient: environmentVariables.SMTP_USER,
            },
          }
        : {}),
    });

    success = true;
    responseOrError = emailPromise;
  } catch (error: unknown) {
    success = false;
    responseOrError = error instanceof Error ? error.message : String(error);
    payload.logger.error({
      err: error,
      msg: `Error while sending tracked email to address: ${to}. Email not sent.`,
    });
  }

  // 3. Prepare the SMTP result
  const smtpResult: Record<string, unknown> = {
    success,
    to,
  };

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
    results.push(smtpResult);

    await payload.update({
      collection: 'outgoing-emails',
      id: outgoingEmailId,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
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
      subResults.push(smtpResult);

      await payload.update({
        collection: 'form-submissions',
        id: formSubmissionId,
        data: {
          smtpResults: subResults,
        } as Record<string, unknown>,
      });
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: `Failed to update form-submissions record ${formSubmissionId} with smtp results.`,
      });
    }
  }
};
