import { environmentVariables } from '@/config/environment-variables';
import { simpleParser } from 'mailparser';
import POP3Command from 'node-pop3';
import type { PayloadRequest } from 'payload';

export const fetchSmtpBouncesTask = {
  slug: 'fetchSmtpBounces',
  retries: 0,
  inputSchema: [],
  handler: async ({ req }: { req: PayloadRequest }): Promise<{ output: { status: string } }> => {
    const { payload } = req;
    const logger = payload.logger;

    const host = environmentVariables.SMTP_HOST;
    const user = environmentVariables.SMTP_USER;
    const password = environmentVariables.SMTP_PASS;

    if (
      typeof user !== 'string' ||
      typeof password !== 'string' ||
      typeof host !== 'string' ||
      user.length === 0 ||
      password.length === 0 ||
      host.length === 0
    ) {
      logger.info('Skipping fetchSmtpBounces: Missing POP3/SMTP credentials.');
      return { output: { status: 'skipped' } };
    }

    try {
      // Connect to POP3 securely on port 995
      const pop3 = new POP3Command({
        host,
        port: 995,
        tls: true,
        user,
        password,
      });

      // Check for POP3 response format securely
      const listResponseRaw: unknown = await pop3.UIDL();
      const messages: string[] = [];

      if (typeof listResponseRaw === 'string') {
        const lines = listResponseRaw.split('\r\n').filter(Boolean);
        for (const line of lines) {
          const parts = line.split(' ');
          const id = parts[0];
          if (typeof id === 'string' && id.length > 0) {
            messages.push(id);
          }
        }
      } else if (Array.isArray(listResponseRaw)) {
        for (const item of listResponseRaw) {
          if (Array.isArray(item) && typeof item[0] === 'string' && item[0].length > 0) {
            messages.push(item[0]);
          } else if (typeof item === 'string' && item.length > 0) {
            messages.push(item);
          }
        }
      }

      if (messages.length === 0) {
        await pop3.QUIT();
        return { output: { status: 'empty' } };
      }

      logger.info(`Found ${messages.length} messages in inbox. Processing...`);

      for (const messageIdString of messages) {
        const messageNumber_ = Number.parseInt(messageIdString, 10);
        if (Number.isNaN(messageNumber_)) continue;

        try {
          const rawEmail: unknown = await pop3.RETR(messageNumber_);
          const parsed = await simpleParser(String(rawEmail));

          let originalEnvelopeId: string | undefined;

          // mailparser exposes headers as a Map
          const originalHeaderValue = parsed.headers.get('original-envelope-id');
          if (typeof originalHeaderValue === 'string') {
            originalEnvelopeId = originalHeaderValue.trim();
          } else if (Array.isArray(originalHeaderValue) && originalHeaderValue.length > 0) {
            const first = originalHeaderValue[0];
            if (typeof first === 'string') {
              originalEnvelopeId = first.trim();
            } else if (typeof first === 'object') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              originalEnvelopeId = String((first as any).value ?? '').trim();
            }
          }

          if (
            typeof originalEnvelopeId !== 'string' &&
            typeof parsed.text === 'string' &&
            parsed.text.length > 0
          ) {
            // Fallback: look for "Original-Envelope-Id: <id>" strings in the bounce report body
            const match = /Original-Envelope-Id:\s*([a-zA-Z0-9]+)/i.exec(parsed.text);
            if (match !== null && typeof match[1] === 'string') {
              originalEnvelopeId = match[1];
            }
          }

          if (typeof originalEnvelopeId === 'string' && originalEnvelopeId.length === 24) {
            // Probably a payload form submission ID
            try {
              const submission = (await payload.findByID({
                collection: 'form-submissions',
                id: originalEnvelopeId,
              })) as { smtpResults?: unknown[] };

              const results = Array.isArray(submission.smtpResults)
                ? [...submission.smtpResults]
                : [];

              const fullText = parsed.text ?? '';
              const subject = parsed.subject ?? '';

              const isSuccess =
                subject.toLowerCase().includes('successful') ||
                fullText.toLowerCase().includes('successfully delivered');
              const dsnString = `Delivery Status Notification. Subject: ${subject}.\n\nReason: ${fullText.trim()}`;

              const newResult: Record<string, unknown> = {
                success: isSuccess,
                to: 'unknown',
                bounceReport: true,
                receivedAt: new Date().toISOString(),
              };

              if (isSuccess) {
                newResult['response'] = { response: dsnString };
              } else {
                newResult['error'] = dsnString;
              }

              results.push(newResult);

              await payload.update({
                collection: 'form-submissions',
                id: originalEnvelopeId,
                data: { smtpResults: results },
              });

              logger.info(`Processed bounce for submission ${originalEnvelopeId} successfully.`);
            } catch (error: unknown) {
              logger.error({
                err: error,
                msg: `Could not process bounce for formSubmission ${originalEnvelopeId}`,
              });
            }
          }

          // Always delete explicitly parsed bounces/autoreplies directed to noreply securely
          await pop3.DELE(messageNumber_);
        } catch (error: unknown) {
          logger.error({ err: error, msg: `Failed to process message ${messageNumber_}` });
        }
      }

      await pop3.QUIT();
    } catch (error: unknown) {
      logger.error({ err: error, msg: 'POP3 fetch error in fetchSmtpBounces' });
    }

    return { output: { status: 'processed' } };
  },
};
