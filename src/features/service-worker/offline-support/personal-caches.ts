import { CACHE_NAMES } from '@/features/service-worker/constants';
import {
  cancelRunningDownload,
  setOfflineSupportEnabled,
} from '@/features/service-worker/offline-support/prefetch';
import { getCleanAppPath } from '@/features/service-worker/offline-support/rsc-utils';

/**
 * Pages without anything personal on them that the app needs to start offline at all: the
 * entrypoint the installed app opens, and the offline page. Nothing else caches them.
 */
const SHARED_PAGES = new Set(['/entrypoint', '/~offline']);

/**
 * Deletes what was rendered for the user who is logging out, for an explicit logout or a switch
 * to another account.
 *
 * The page and RSC caches keep server-rendered pages, and those carry personal data: the
 * settings page shows name, email, Hof and role. On a shared phone the next person saw them
 * offline, and online too whenever the network took longer than the worker's timeout. The
 * offline download is reset with them, because it was fetched with the previous user's cookie:
 * a download still running stops writing, and the next user downloads their own.
 */
export async function clearPersonalCaches(): Promise<void> {
  cancelRunningDownload();

  const pagesCache = await caches.open(CACHE_NAMES.PAGES);
  const pages = await pagesCache.keys();
  await Promise.all(
    pages
      .filter((request) => !SHARED_PAGES.has(getCleanAppPath(new URL(request.url).pathname)))
      .map((request) => pagesCache.delete(request)),
  );
  await caches.delete(CACHE_NAMES.RSC);
  await setOfflineSupportEnabled(false);
}
