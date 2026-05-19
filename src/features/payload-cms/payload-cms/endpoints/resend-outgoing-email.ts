import { environmentVariables } from '@/config/environment-variables';
import type { PayloadHandler } from 'payload';

export const resendOutgoingEmailHandler: PayloadHandler = async (request) => {
  const { payload, user, routeParams } = request;
  const id = routeParams?.['id'];

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    const results = Array.isArray(emailDocument.smtpResults) ? [...emailDocument.smtpResults] : [];
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

    return Response.json({ success, result: smtpResult });
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Error in resendOutgoingEmailHandler' });
    return Response.json({ error: String(error) }, { status: 500 });
  }
};
