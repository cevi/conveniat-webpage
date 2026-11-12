import type { FeatureFlagKey } from '@/lib/feature-flags';
import { featureFlagNames, featureFlags, type FeatureFlagName } from '@/lib/feature-flags';
import { defineCounter } from '@/lib/telemetry/metrics';
import { createLogger } from '@/utils/server-logger';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const logger = createLogger('feature-flags');

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === 'phase-production-build';

/**
 * How long a load is used before the next read reloads it in the background, which is how long
 * an admin's change takes to reach the other replicas. The replica that saves it applies it at
 * once, see `rememberSavedFeatureFlags`.
 */
const REFRESH_AFTER_MS = 5000;

/**
 * Where a value came from: the latest load, an older load because the latest attempt failed,
 * or the flag's `whenUnavailable` because no load has succeeded yet.
 */
export type FeatureFlagSource = 'loaded' | 'last_known' | 'unavailable';

const evaluations = defineCounter<{ flag: FeatureFlagKey; source: FeatureFlagSource }>({
  scope: 'feature-flags',
  name: 'feature_flag_evaluations_total',
  description: 'Feature flag reads, by flag and by where the value came from',
});

type FeatureFlagValues = Record<FeatureFlagName, boolean>;

interface FeatureFlagCache {
  values: FeatureFlagValues | undefined;
  /** When the latest load started, successful or not, in epoch milliseconds. */
  attemptedAt: number;
  /** Whether the latest load failed; logged once when it starts and once when it ends. */
  failing: boolean;
  /** The load in flight, which every read waiting for one shares. */
  loading: Promise<void> | undefined;
}

/**
 * On `globalThis`, so the copy the admin panel updates on a save is the one tRPC and the pages
 * read, also where the server bundles a module more than once.
 */
const globalForFeatureFlags = globalThis as unknown as {
  featureFlagCache: FeatureFlagCache | undefined;
};

const cache = (): FeatureFlagCache =>
  (globalForFeatureFlags.featureFlagCache ??= {
    values: undefined,
    attemptedAt: 0,
    failing: false,
    loading: undefined,
  });

const valuesOf = (document: Record<string, unknown>): FeatureFlagValues =>
  Object.fromEntries(
    featureFlagNames.map((name) => {
      const value = document[name];
      return [name, typeof value === 'boolean' ? value : featureFlags[name].default];
    }),
  ) as FeatureFlagValues;

const load = async (): Promise<void> => {
  const state = cache();
  state.attemptedAt = Date.now();
  try {
    // imported here: the global that calls `rememberSavedFeatureFlags` is part of the config
    const { getPayload } = await import('payload');
    const { default: config } = await import('@payload-config');
    const payload = await getPayload({ config });
    const document = await payload.findGlobal({ slug: 'app-feature-flags', depth: 0 });
    state.values = valuesOf(document as unknown as Record<string, unknown>);
    if (state.failing) logger.info('Feature flags load again');
    state.failing = false;
  } catch (error) {
    if (!state.failing) {
      logger.warn('Feature flags could not be loaded, serving the last values loaded', {
        error,
        'feature_flag.has_last_known': state.values !== undefined,
      });
    }
    state.failing = true;
  }
};

const startLoad = (): Promise<void> => {
  const state = cache();
  state.loading ??= load().finally(() => {
    state.loading = undefined;
  });
  return state.loading;
};

/**
 * The current values. Only the first load is waited for; after that a read answers from memory
 * and starts a reload in the background once the values are older than `REFRESH_AFTER_MS`, so
 * a slow or unreachable database never holds up a request.
 */
const currentValues = async (): Promise<{
  values: FeatureFlagValues | undefined;
  source: FeatureFlagSource;
}> => {
  const state = cache();
  const isDue = Date.now() - state.attemptedAt >= REFRESH_AFTER_MS;
  if (state.values === undefined) {
    if (isDue || state.loading !== undefined) await startLoad();
  } else if (isDue) {
    void startLoad();
  }
  if (state.values === undefined) return { values: undefined, source: 'unavailable' };
  return { values: state.values, source: state.failing ? 'last_known' : 'loaded' };
};

/**
 * Reads several feature flags at once, from the copy in memory. See `FeatureFlagDefinition`
 * for the value a flag has before an admin sets it and while the flags cannot be loaded.
 */
export const readFeatureFlags = async <N extends FeatureFlagName>(
  names: readonly N[],
): Promise<Record<N, boolean>> => {
  // `next build` has no database to ask; the defaults are what a fresh deployment starts with
  if (isBuild) {
    return Object.fromEntries(names.map((name) => [name, featureFlags[name].default])) as Record<
      N,
      boolean
    >;
  }

  const { values, source } = await currentValues();
  return Object.fromEntries(
    names.map((name) => {
      evaluations.add(1, { flag: featureFlags[name].key, source });
      return [name, values?.[name] ?? featureFlags[name].whenUnavailable];
    }),
  ) as Record<N, boolean>;
};

/** Reads one feature flag, see `readFeatureFlags`. */
export const readFeatureFlag = async (name: FeatureFlagName): Promise<boolean> => {
  const values = await readFeatureFlags([name]);
  return values[name];
};

/**
 * Takes the flags an admin just saved, so this replica applies them at once instead of at its
 * next reload. Called by the `app-feature-flags` global after a change.
 */
export const rememberSavedFeatureFlags = (document: Record<string, unknown>): void => {
  const state = cache();
  state.values = valuesOf(document);
  state.attemptedAt = Date.now();
  state.failing = false;
};
