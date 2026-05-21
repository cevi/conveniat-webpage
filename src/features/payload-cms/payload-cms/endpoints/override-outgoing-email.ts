import { hasAccessToThis, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadHandler } from 'payload';

export const overrideOutgoingEmailStatusHandler: PayloadHandler = async (request) => {
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

  // Parse target status from request body
  let body: { status?: 'success' | 'error' } = {};
  try {
    body = request.json
      ? ((await request.json()) as { status?: 'success' | 'error' })
      : ((request as unknown as { data?: { status?: 'success' | 'error' } }).data ?? {});
  } catch {
    // Empty or malformed body
  }

  const targetStatus = body.status;
  if (targetStatus !== 'success' && targetStatus !== 'error') {
    return Response.json({ error: 'Invalid or missing target status' }, { status: 400 });
  }

  try {
    const emailDocument = await payload.findByID({
      collection: 'outgoing-emails',
      id,
    });

    const isSuccess = targetStatus === 'success';

    // Append manual override events to both SMTP and DSN status
    const manualResult: Record<string, unknown> = {
      success: isSuccess,
      to: emailDocument.to,
      retriggeredBy: user.id,
      retriggeredAt: new Date().toISOString(),
      manualOverride: true,
      response: {
        response: isSuccess
          ? `Status manually set to SUCCESS by Admin ${user.email} (${user.id})`
          : `Status manually set to ERROR by Admin ${user.email} (${user.id})`,
      },
      bounceReport: false, // For SMTP status
    };

    const manualDsnResult: Record<string, unknown> = {
      success: isSuccess,
      to: emailDocument.to,
      retriggeredBy: user.id,
      retriggeredAt: new Date().toISOString(),
      manualOverride: true,
      bounceReport: true, // For DSN status
      parsedDsn: {
        action: isSuccess ? 'delivered' : 'failed',
        status: isSuccess ? '2.0.0' : '5.0.0',
        diagnosticCode: isSuccess
          ? `Manually marked as SUCCESS by Admin ${user.email}`
          : `Manually marked as ERROR by Admin ${user.email}`,
        actionDate: new Date().toISOString(),
      },
      response: {
        response: isSuccess
          ? `DSN manually set to SUCCESS by Admin ${user.email} (${user.id})`
          : `DSN manually set to ERROR by Admin ${user.email} (${user.id})`,
      },
    };

    // Use rawSmtpResults
    const results = Array.isArray(emailDocument.rawSmtpResults)
      ? [...emailDocument.rawSmtpResults]
      : [];

    // Append both the SMTP and DSN overrides so that both states resolve perfectly in the UI
    results.push(manualResult, manualDsnResult);

    await payload.update({
      collection: 'outgoing-emails',
      id,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        deliveryStatus: targetStatus,
        smtpReceivedAt: new Date().toISOString(),
        dsnReceivedAt: new Date().toISOString(),
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
        subResults.push(manualResult, manualDsnResult);

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
          msg: `Failed to update form-submissions record ${formSubmissionId} with overridden SMTP results in overrideOutgoingEmailStatusHandler.`,
        });
      }
    }

    return Response.json({
      success: true,
      deliveryStatus: targetStatus,
    });
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Error in overrideOutgoingEmailStatusHandler' });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};
