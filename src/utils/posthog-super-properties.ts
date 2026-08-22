// `@/build` is generated at build time and imports nothing itself, so it cannot create
// the cycles this rule guards against. Same exemption as `@/utils/get-build-info`.
// eslint-disable-next-line import/no-restricted-paths
import build from '@/build';
import type { NativeAppInfo } from '@/hooks/use-native-app-info';
import { isNativeAppWebView } from '@/utils/standalone-check';
import type { PostHog } from 'posthog-js';

/**
 * Properties that describe the native wrapper build.
 *
 * PostHog already captures `$os` / `$os_version` (e.g. iOS 18.7.0) and the raw user
 * agent, so the platform and OS are covered. What it cannot see is which release of
 * the wrapper is running: the shell hardcodes `KonektaApp/1.0` into the user agent,
 * so every native client looks identical and a native regression is unattributable.
 *
 * These keys are only meaningful inside the native app. `register()` persists to
 * local storage, so they are explicitly unregistered everywhere else - a value left
 * over from an earlier native session would otherwise mislabel later browser
 * sessions on the same origin.
 */
const NATIVE_ONLY_KEYS = ['native_app_version', 'native_build_number'];

/**
 * The native shell injects `AppWebViewNativeApp` via a user script, which can land
 * after our own bundle runs. Re-check a few times before concluding it is absent.
 */
const BRIDGE_POLL_INTERVAL_MS = 500;
const BRIDGE_POLL_ATTEMPTS = 10;

const readNativeAppInfo = (): NativeAppInfo | undefined => {
  try {
    const info = globalThis.AppWebViewNativeApp;
    if (info === undefined) return undefined;

    const hasVersion = typeof info.version === 'string' && info.version.trim() !== '';
    const hasBuildNumber = typeof info.buildNumber === 'string' && info.buildNumber.trim() !== '';

    return hasVersion && hasBuildNumber ? info : undefined;
  } catch {
    // A torn-down WebView can leave exotic globals behind; a read must never throw.
    return undefined;
  }
};

const forgetNativeProperties = (client: PostHog): void => {
  for (const key of NATIVE_ONLY_KEYS) {
    client.unregister(key);
  }
};

/**
 * Registers the super properties that PostHog cannot derive on its own, so that
 * every event - `$exception` included - carries them.
 *
 * Returns a disposer that cancels any pending bridge poll.
 *
 * This is telemetry setup: it is wrapped so that a failure can never take down
 * PostHog initialisation, and in particular can never stop exceptions being
 * captured. It only ever adds properties; it does not touch `before_send`,
 * exception autocapture, or session recording.
 */
export const registerPostHogSuperProperties = (client: PostHog): (() => void) => {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const apply = (attempt: number): void => {
    if (cancelled) return;

    try {
      const isNative = isNativeAppWebView();

      // Recomputed on every page load, so a persisted value always self-corrects.
      client.register({
        is_native_app: isNative,
        // `src/build.ts` is generated at build time. `$app_version` is the property
        // PostHog's error tracking uses for "which release introduced this", and
        // `web_commit_hash` matches the `commitHash` on the server-side OTEL logs,
        // so an issue can be lined up against a deploy.
        $app_version: build.version,
        web_commit_hash: build.git.hash,
      });

      if (!isNative) {
        forgetNativeProperties(client);
        return;
      }

      const nativeAppInfo = readNativeAppInfo();
      if (nativeAppInfo !== undefined) {
        client.register({
          native_app_version: nativeAppInfo.version,
          native_build_number: nativeAppInfo.buildNumber,
        });
        return;
      }

      if (attempt < BRIDGE_POLL_ATTEMPTS) {
        timer = setTimeout(() => apply(attempt + 1), BRIDGE_POLL_INTERVAL_MS);
        return;
      }

      // The bridge never showed up. Drop any stale values rather than reporting a
      // version we can no longer confirm.
      forgetNativeProperties(client);
    } catch (error: unknown) {
      console.warn('[PostHog] failed to register super properties:', error);
    }
  };

  apply(1);

  return (): void => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  };
};
