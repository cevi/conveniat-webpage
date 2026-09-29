'use client';

// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOnboardingStorageResult {
  offlineContentHandled: boolean;
  hasCachedContent: boolean;
  handleOfflineContent: (accepted: boolean) => void;
}

export const useOnboardingStorage = (): UseOnboardingStorageResult => {
  const [offlineContentHandled, setOfflineContentHandled] = useState(false);
  const [hasCachedContent, setHasCachedContent] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const checkStorage = async (): Promise<void> => {
      // 1. Offline Content (DB Check)
      let isHandled = false;
      try {
        const { readPreference } = await import('@/lib/preferences');
        isHandled = readPreference('offline-content-handled');
      } catch (error) {
        console.warn('Failed to check offline preferences', error);
      }

      // 2. Cache Content
      let hasCache = false;
      if (typeof caches !== 'undefined') {
        try {
          const pagesCache = await caches.open(CACHE_NAMES.PAGES);
          const keys = await pagesCache.keys();
          if (keys.length > 5) {
            hasCache = true;
          }
        } catch (error) {
          console.warn('Failed to check cache', error);
        }
      }

      if (isMounted.current) {
        setOfflineContentHandled(isHandled);
        setHasCachedContent(hasCache);
      }
    };

    void checkStorage();
  }, []);

  const handleOfflineContent = useCallback((accepted: boolean) => {
    void import('@/lib/preferences')
      .then(({ writePreference }) => {
        writePreference('offline-content-handled', true);
        writePreference('offline-content-accepted', accepted);
      })
      .catch((error: unknown) => console.warn('Failed to store offline preferences', error));

    // Store skip preference in cookies as well for a fast secondary check
    Cookies.set(Cookie.OFFLINE_CONTENT_HANDLED, 'true', { expires: 730 });

    // Optimistic update
    setOfflineContentHandled(true);
  }, []);

  return {
    offlineContentHandled,
    hasCachedContent,
    handleOfflineContent,
  };
};
