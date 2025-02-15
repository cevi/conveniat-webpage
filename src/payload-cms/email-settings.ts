import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

const ENABLE_MAIL = process.env['ENABLE_NODEMAILER'] === 'true';
const SMTP_HOST = process.env['SMTP_HOST'] ?? '';
const SMTP_PORT = process.env['SMTP_PORT'] ?? 0;
const SMTP_USER = process.env['SMTP_USER'] ?? '';
const SMTP_PASS = process.env['SMTP_PASS'] ?? '';
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
export const emailSettings = ENABLE_MAIL
  ? {
      email: nodemailerAdapter({
        defaultFromAddress: 'no-reply@conveniat27.ch',
        defaultFromName: 'conveniat27',
        transportOptions: {
          host: SMTP_HOST,
          port: SMTP_PORT,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        },
      }),
    }
  : {};
