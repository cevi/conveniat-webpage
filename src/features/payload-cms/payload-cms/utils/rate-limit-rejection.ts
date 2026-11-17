/**
 * How mail servers word a refusal because too much mail went out, e.g. Plesk's
 * "554 5.7.0 … The limit on the number of allowed outgoing messages was exceeded".
 */
const RATE_LIMIT_REJECTION =
  /limit on the number of allowed outgoing messages|rate.?limit|too many (?:messages|mails|emails|recipients)|sending (?:quota|limit) exceeded/i;

/**
 * Whether an SMTP error says the server's limit of outgoing mail was reached, rather than
 * that something is wrong with this mail. The server took nothing, so the mail can be sent
 * again later without anybody getting it twice.
 *
 * Without dependencies, because the admin panel reads the stored errors with it too.
 */
export const isRateLimitRejection = (error: unknown): boolean =>
  RATE_LIMIT_REJECTION.test(String(error));
