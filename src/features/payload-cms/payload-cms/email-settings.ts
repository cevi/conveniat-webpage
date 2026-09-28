import { environmentVariables } from '@/config/environment-variables';
import { EMAIL_SENDER_ADDRESS } from '@/features/payload-cms/payload-cms/utils/email-sender';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

/**
 * NodeMailer Adapter for sending emails via SMTP
 * @see https://payloadcms.com/docs/email/overview
 *
 * Note: The following environment variables must be set in order to enable email sending:
 * - ENABLE_NODEMAILER=true
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 *
 * By default, email sending is disabled for local development,
 * it must be enabled using ENABLE_NODEMAILER.
 */
export const emailSettings = environmentVariables.ENABLE_NODEMAILER
  ? {
      email: nodemailerAdapter({
        defaultFromAddress: EMAIL_SENDER_ADDRESS,
        defaultFromName: 'conveniat27',
        skipVerify: true,
        transportOptions: {
          host: environmentVariables.SMTP_HOST,
          port: environmentVariables.SMTP_PORT,
          auth: {
            user: environmentVariables.SMTP_USER,
            pass: environmentVariables.SMTP_PASS,
          },
        },
      }),
    }
  : {};
