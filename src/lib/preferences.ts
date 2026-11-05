import { userPreferencesCollection } from '@/lib/tanstack-db';
import { z } from 'zod';

interface PreferenceDefinition<Value> {
  schema: z.ZodType<Value>;
  /** What reading returns while nothing is stored, or what is stored no longer parses. */
  fallback: Value;
  /**
   * Whether the preference belongs to this device rather than to whoever is logged in.
   * `flushPersonalData` keeps these. It also runs when a session merely expires, so a
   * device setting that is not kept resets itself without the user ever logging out.
   */
  keepOnLogout: boolean;
}

const definePreference = <Value>(
  definition: PreferenceDefinition<Value>,
): PreferenceDefinition<Value> => definition;

/**
 * Every preference that has to survive an app restart. A new one is an entry here; the
 * schema guards the read, so a value an older build stored, or a hand-edited one, falls
 * back instead of reaching the UI in a shape it does not expect.
 */
const preferences = {
  'offline-content-handled': definePreference({
    schema: z.boolean(),
    fallback: false,
    keepOnLogout: false,
  }),
  'offline-content-accepted': definePreference({
    schema: z.boolean(),
    fallback: false,
    keepOnLogout: false,
  }),
  /**
   * The user turned native push off on this device. Whether a token exists says nothing
   * about that: the native shell has Firebase issue a new token right after deleting one,
   * and reports it on every resume.
   */
  'native-push-opted-out': definePreference({
    schema: z.boolean(),
    fallback: false,
    keepOnLogout: true,
  }),
  /**
   * The user turned web push off on this device. A missing subscription says nothing about
   * that: the browser can drop one on its own, and an unregistered service worker takes its
   * subscription with it, both with the permission still granted. While this is unset, the
   * app subscribes such a browser again on start (`useOnboardingRecheck`).
   */
  'web-push-opted-out': definePreference({
    schema: z.boolean(),
    fallback: false,
    keepOnLogout: true,
  }),
  /**
   * When this browser last told the server its push subscription is still in use, in
   * milliseconds since the epoch. The check-in runs at most once a day, see
   * `useOnboardingRecheck`. Personal, so the next person to log in on the device checks in at once.
   */
  'web-push-checked-in-at': definePreference({
    schema: z.number(),
    fallback: 0,
    keepOnLogout: false,
  }),
  /** The last queries of the site search, newest first, offered while its field is empty. */
  'recent-searches': definePreference({
    schema: z.array(z.string()),
    fallback: [] as string[],
    keepOnLogout: false,
  }),
};

export type PreferenceKey = keyof typeof preferences;
export type PreferenceValue<Key extends PreferenceKey> =
  (typeof preferences)[Key] extends PreferenceDefinition<infer Value> ? Value : never;

/**
 * The last value read per key, returned again while the stored value is unchanged, so an
 * object preference keeps its identity across reads as `useSyncExternalStore` requires.
 */
const readCache = new Map<PreferenceKey, { stored: unknown; value: unknown }>();

/** Reads a preference, or its fallback while nothing valid is stored. */
export function readPreference<Key extends PreferenceKey>(key: Key): PreferenceValue<Key> {
  const { schema, fallback } = preferences[key] as PreferenceDefinition<PreferenceValue<Key>>;
  const stored: unknown = userPreferencesCollection.get(key)?.value;

  const cached = readCache.get(key);
  if (cached !== undefined && cached.stored === stored) {
    return cached.value as PreferenceValue<Key>;
  }

  const parsed = schema.safeParse(stored);
  const value = parsed.success ? parsed.data : fallback;
  readCache.set(key, { stored, value });
  return value;
}

/** Returns what a preference reads as before anything is stored, e.g. during server render. */
export function readPreferenceFallback<Key extends PreferenceKey>(key: Key): PreferenceValue<Key> {
  return (preferences[key] as PreferenceDefinition<PreferenceValue<Key>>).fallback;
}

/** Stores a preference. It is in localStorage by the time this returns. */
export function writePreference<Key extends PreferenceKey>(
  key: Key,
  value: PreferenceValue<Key>,
): void {
  if (userPreferencesCollection.has(key)) {
    userPreferencesCollection.update(key, (draft) => {
      draft.value = value;
    });
  } else {
    userPreferencesCollection.insert({ key, value });
  }
}

/** Calls `onChange` whenever any preference changes, in this tab or another one. */
export function subscribeToPreferences(onChange: () => void): () => void {
  const subscription = userPreferencesCollection.subscribeChanges(onChange);
  return (): void => subscription.unsubscribe();
}

/**
 * Removes every preference that belongs to the logged-in user, and any key no longer
 * declared above, and keeps the ones that belong to the device.
 */
export function clearPersonalPreferences(): void {
  const keys = [...userPreferencesCollection.state.keys()];
  for (const key of keys) {
    const definition = (preferences as Record<string, PreferenceDefinition<unknown> | undefined>)[
      key
    ];
    if (definition?.keepOnLogout !== true) {
      userPreferencesCollection.delete(key);
    }
  }
}
