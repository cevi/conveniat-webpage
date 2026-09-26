import type { ServerLogger } from '@/utils/server-logger';

/**
 * What a billing use case writes its log records through.
 *
 * Narrower than {@link ServerLogger} because nothing in billing has a reason to write `trace`
 * or `fatal`, and a smaller shape is easier to stand in for in a test. The attribute bag is
 * the point: a group id, a count or a duration belongs in a field a Loki query can filter on,
 * not interpolated into the message.
 */
export type BillingLogger = Pick<ServerLogger, 'debug' | 'info' | 'warn' | 'error'>;
