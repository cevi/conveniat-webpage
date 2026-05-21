import { environmentVariables } from '@/config/environment-variables';
import { hasAccessToThis, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadHandler } from 'payload';

export const resendOutgoingEmailHandler: PayloadHandler = async (request) => {
  const { payload, user, routeParams } = request;
  const id = routeParams?.['id'];

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = hasAccessToThis({
    req: request,
    requiredRoles: [Roles.FullAdmin],
  });
  if (!hasAccess) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (typeof id !== 'string' || id.length === 0) {
    return Response.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const emailDocument = await payload.findByID({
      collection: 'outgoing-emails',
      id,
    });

    // Prepare email options
    const emailOptions = {
      to: emailDocument.to,
      subject: emailDocument.subject,
      html: emailDocument.html,
      ...(typeof environmentVariables.SMTP_USER === 'string' &&
      environmentVariables.SMTP_USER.length > 0
        ? {
            dsn: {
              id: String(id),
              return: 'headers',
              notify: ['success', 'failure', 'delay'],
              recipient: environmentVariables.SMTP_USER,
            },
          }
        : {}),
    };

    let success = false;
    let responseOrError: unknown;

    try {
      const emailPromise = await payload.sendEmail(emailOptions);
      success = true;
      responseOrError = emailPromise;
    } catch (error: unknown) {
      success = false;
      responseOrError = error instanceof Error ? error.message : String(error);
      payload.logger.error({
        err: error,
        msg: `Error while resending tracked email to address: ${emailDocument.to}. Email not sent.`,
      });
    }

    const smtpResult: Record<string, unknown> = {
      success,
      to: emailDocument.to,
      retriggeredBy: user.id,
      retriggeredAt: new Date().toISOString(),
    };

    if (success) {
      smtpResult['response'] = responseOrError;
    } else {
      smtpResult['error'] = responseOrError;
    }

    // Use rawSmtpResults to avoid copying computed/ephemeral hooks data (like parsedDsn) from smtpResults
    const results = Array.isArray(emailDocument.rawSmtpResults)
      ? [...emailDocument.rawSmtpResults]
      : [];
    results.push(smtpResult);

    await payload.update({
      collection: 'outgoing-emails',
      id,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        deliveryStatus: success ? 'success' : 'error',
        smtpReceivedAt: new Date().toISOString(),
        lastRetriggeredBy: user.id,
      },
    });

    // Sync with Form Submission if it exists
    const formSubmissionRelated = emailDocument.formSubmission;
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
        subResults.push(smtpResult);

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
          msg: `Failed to update form-submissions record ${formSubmissionId} with resent SMTP results in resendOutgoingEmailHandler.`,
        });
      }
    }

    return Response.json({
      success,
      result: smtpResult,
      ...(success ? {} : { error: String(responseOrError) }),
    });
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Error in resendOutgoingEmailHandler' });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};
