import { CACHE_NAMES } from '@/features/service-worker/constants';
import { setOfflineSupportEnabled } from '@/features/service-worker/offline-support/prefetch';

/**
 * Deletes every cache that holds something rendered for the signed-in user, for a logout or an
 * expired session.
 *
 * The page and RSC caches keep server-rendered pages, and those carry personal data: the
 * settings page shows name, email, Hof and role. On a shared phone the next person saw them
 * offline, and online too whenever the network took longer than the worker's timeout. The
 * offline download is reset with them, because it was fetched with the previous user's cookie;
 * the next user downloads their own.
 */
export async function clearPersonalCaches(): Promise<void> {
  await Promise.all([
    caches.delete(CACHE_NAMES.AUTH_SESSION),
    caches.delete(CACHE_NAMES.PAGES),
    caches.delete(CACHE_NAMES.RSC),
  ]);
  await setOfflineSupportEnabled(false);
}
