import { useEffect } from 'react';

/**
 * A hook to manage a single search parameter in the URL with conditional history synchronization.
 * It uses pushState only when transitioning from no value to having a value,
 * and replaceState for all subsequent changes.
 */
export const useQueryState = (
  key: string,
  value: string | undefined,
  onChange: (newValue: string | undefined) => void,
  enabled: boolean = true,
): void => {
  // Effect 1: Read initial value from URL on mount
  useEffect(() => {
    if (!enabled) return;

    const url = new URL(globalThis.location.href);
    const initialValue = url.searchParams.get(key);
    if (initialValue !== null && initialValue !== '') {
      onChange(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Run once on mount if enabled

  // Effect 2: Sync value to URL
  useEffect(() => {
    if (!enabled) return;

    const url = new URL(globalThis.location.href);
    const currentValue = url.searchParams.get(key);
    const newValue = value;

    if (newValue === currentValue) return;

    if (newValue !== undefined && newValue !== '') {
      url.searchParams.set(key, newValue);
    } else {
      url.searchParams.delete(key);
    }

    const isNewSelection =
      (currentValue === null || currentValue === '') && newValue !== undefined && newValue !== '';

    if (isNewSelection) {
      globalThis.history.pushState({}, '', url.toString());
    } else {
      globalThis.history.replaceState({}, '', url.toString());
    }
  }, [key, value, enabled]);

  // Effect 3: Handle browser back/forward navigation
  useEffect(() => {
    if (!enabled) return;

    const handlePopState = (): void => {
      const url = new URL(globalThis.location.href);
      const currentValue = url.searchParams.get(key);
      onChange(currentValue ?? undefined);
    };

    globalThis.addEventListener('popstate', handlePopState);
    return (): void => globalThis.removeEventListener('popstate', handlePopState);
  }, [key, onChange, enabled]);
};
