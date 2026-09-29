'use client';

import {
  readPreference,
  readPreferenceFallback,
  subscribeToPreferences,
  type PreferenceKey,
  type PreferenceValue,
} from '@/lib/preferences';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Renders a stored preference and re-renders when it changes, including from another tab.
 * The server, and the first render on the client, see the fallback, so hydration matches.
 * Write it with `writePreference`.
 */
export function usePreference<Key extends PreferenceKey>(key: Key): PreferenceValue<Key> {
  const getSnapshot = useCallback((): PreferenceValue<Key> => readPreference(key), [key]);
  const getServerSnapshot = useCallback(
    (): PreferenceValue<Key> => readPreferenceFallback(key),
    [key],
  );
  return useSyncExternalStore(subscribeToPreferences, getSnapshot, getServerSnapshot);
}
