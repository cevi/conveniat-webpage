import { environmentVariables } from '@/config/environment-variables';

/**
 * The address every mail of this deployment goes out from.
 *
 * It is the SMTP login, `noreply@cevi.tools` on every stack, because that is the mailbox
 * `fetchSmtpBounces` polls for DSNs. `no-reply@cevi.tools`, which the DMARC `rua` names and
 * some forms use as their From, is only an alias delivering into the same mailbox.
 */
export const EMAIL_SENDER_ADDRESS: string =
  typeof environmentVariables.SMTP_USER === 'string' && environmentVariables.SMTP_USER !== ''
    ? environmentVariables.SMTP_USER
    : 'noreply@cevi.tools';

/** The domain of {@link EMAIL_SENDER_ADDRESS}, which is the one the mails are signed for. */
export const EMAIL_SENDER_DOMAIN: string = EMAIL_SENDER_ADDRESS.split('@')[1] ?? 'cevi.tools';
