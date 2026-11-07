import { ONBOARDING_COMPLETE_KEY } from '@/lib/onboarding-complete';
import type React from 'react';

/** Where the app starts once the onboarding has nothing left to show. */
export const FAST_PATH_TARGET = '/app/dashboard';

/**
 * The script below, as a function, so it can be tested; the inline script is its source text.
 *
 * Only the plain app start takes the fast path: `/entrypoint?app-mode=true` and nothing else.
 * A link with a target (`redirectTo`, `chatId`, a share), `clearSkip` or a pending push target
 * goes through the onboarding, which knows what to do with them.
 */
export function entrypointFastPath(
  location: Pick<Location, 'pathname' | 'search' | 'replace'>,
  storage: { local: Pick<Storage, 'getItem'>; session: Pick<Storage, 'getItem'> },
  key: string,
  target: string,
): void {
  try {
    if (location.pathname !== '/entrypoint') return;
    // the plain app start and nothing else; no iteration, which the compiler may turn into a
    // helper the inline script cannot reach. `network` is the native app's hint for the
    // service worker, which has read it by now.
    const parameters = new URLSearchParams(location.search);
    parameters.delete('network');
    if (parameters.toString() !== 'app-mode=true') return;
    if (storage.local.getItem(key) !== 'true') return;
    if (
      storage.session.getItem('pending_push_redirect') !== null ||
      storage.local.getItem('pending_push_redirect') !== null
    ) {
      return;
    }
    location.replace(target);
  } catch {
    // storage blocked or an old browser: the onboarding decides, as before
  }
}

/**
 * Leaves the entrypoint before it boots when the onboarding has nothing left to show.
 *
 * Inline, so it runs while the HTML is parsed: online and offline, and before the
 * entrypoint's bundle loads. See `ONBOARDING_COMPLETE_KEY` for when the record is set and removed.
 */
export const EntrypointFastPath: React.FC = () => (
  <script
    dangerouslySetInnerHTML={{
      // A browser that blocks site data throws on reading the storages themselves, which happens
      // here, before the function's own guard. This runs before any bundle, so nothing can stand
      // in for them yet, see `installBlockedStorageFallback`.
      __html: `try{(${entrypointFastPath.toString()})(location,{local:localStorage,session:sessionStorage},${JSON.stringify(ONBOARDING_COMPLETE_KEY)},${JSON.stringify(FAST_PATH_TARGET)})}catch(e){}`,
    }}
  />
);
