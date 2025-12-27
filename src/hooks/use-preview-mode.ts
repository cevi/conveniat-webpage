import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * A custom React hook to manage the 'preview' query parameter in the URL.
 * It provides the current preview mode status and a function to toggle it.
 *
 * @returns {{
 *      isInPreviewMode: 'enabled' | 'disabled',
 *      togglePreviewMode: (value: 'enabled' | 'disabled') => void
 * }}
 *
 * - isInPreviewMode: 'enabled' if 'preview=true' is in the URL, otherwise 'disabled'.
 * - togglePreviewMode: A function to set the preview mode.
 */
export const usePreviewMode = (): {
  isInPreviewMode: 'enabled' | 'disabled';
  togglePreviewMode: (value: 'enabled' | 'disabled') => void;
} => {
  const searchParameters = useSearchParams();
  const router = useRouter();

  const isInPreviewMode = useMemo(() => {
    return searchParameters.get('preview') === 'false' ? 'disabled' : 'enabled';
  }, [searchParameters]);

  const togglePreviewMode = useCallback(
    (value: 'enabled' | 'disabled') => {
      const newUrl = new URL(globalThis.location.href);

      if (value === 'enabled') {
        newUrl.searchParams.delete('preview');
      } else {
        newUrl.searchParams.set('preview', 'false');
      }

      router.push(newUrl.toString());
    },
    [router],
  );

  return { isInPreviewMode, togglePreviewMode };
};
