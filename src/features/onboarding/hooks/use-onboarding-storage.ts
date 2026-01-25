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
        const { userPreferencesCollection } = await import('@/lib/tanstack-db');
        isHandled = !!userPreferencesCollection.get('offline-content-handled');
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
    // Store preference in TanStack DB
    void import('@/lib/tanstack-db').then(({ userPreferencesCollection }) => {
      userPreferencesCollection.insert({ key: 'offline-content-handled', value: true });
      if (accepted) {
        userPreferencesCollection.insert({ key: 'offline-content-accepted', value: true });
      } else {
        userPreferencesCollection.insert({ key: 'offline-content-accepted', value: false });
      }
    });

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
