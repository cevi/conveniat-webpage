/**
 * Message used whenever a request is rejected because the user is blocked.
 *
 * The clients match on this exact string (see `isUserBlockedError`) in order to
 * distinguish "you are blocked" from a generic authorization failure.
 */
export const USER_BLOCKED_ERROR_MESSAGE = 'USER_BLOCKED';

/**
 * How long a resolved blocked-status is cached in memory.
 *
 * Blocking has to take effect (almost) immediately, so the TTL is deliberately
 * short. The cache only exists to avoid hitting the database on every single
 * authenticated request.
 */
export const BLOCKED_STATUS_CACHE_TTL_MS = 5000;
