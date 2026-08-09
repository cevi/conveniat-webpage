import { USER_BLOCKED_ERROR_MESSAGE } from '@/lib/user-blocking/constants';

/**
 * Detects whether a (tRPC) error was caused by the user being blocked.
 *
 * Client-safe: unlike `is-user-blocked.ts` this module does not touch the database.
 */
export const isUserBlockedError = (error: unknown): boolean => {
  if (error === null || typeof error !== 'object') return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.includes(USER_BLOCKED_ERROR_MESSAGE);
};

const RELOAD_THROTTLE_MS = 60_000;
const RELOAD_STORAGE_KEY = 'conveniat27:user-blocked-reload';

/**
 * Decides whether the page may be reloaded because of a blocked user, and records the
 * attempt.
 *
 * Throttled via `sessionStorage` so that a disagreement between client and server can
 * never turn into a reload loop.
 */
export const shouldReloadForBlockedUser = (): boolean => {
  try {
    const lastReload = Number.parseInt(
      globalThis.sessionStorage.getItem(RELOAD_STORAGE_KEY) ?? '',
      10,
    );
    if (!Number.isNaN(lastReload) && Date.now() - lastReload < RELOAD_THROTTLE_MS) return false;
    globalThis.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode) — reloading once is still correct
  }

  return true;
};

/**
 * Reloads the page after the server reported that the user is blocked, so that the
 * server-rendered blocked notice replaces the app shell.
 */
export const reloadForBlockedUser = (): void => {
  // guard against the server: `makeQueryClient` is also used for RSC prefetching
  if (!('window' in globalThis)) return;
  if (!shouldReloadForBlockedUser()) return;

  globalThis.location.reload();
};
