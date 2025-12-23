'use client';

import { offlinePages } from '@/config/offline-pages';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

/**
 * Component that prefetches all configured offline pages using the Next.js router.
 * This ensures that all necessary JS chunks and RSC data for these pages are
 * downloaded and cached by the Service Worker's runtime caching rules.
 */
export function PrefetchOfflinePages(): ReactNode {
  const router = useRouter();

  useEffect(() => {
    // Wait a short delay after initial mount to avoid competing with critical resources
    const timer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Offline Prefetch] Skipping prefetch because device is offline');
        return;
      }

      console.log(
        '[Offline Prefetch] Starting aggressive prefetch for offline pages:',
        offlinePages,
      );

      for (const page of offlinePages) {
        try {
          // Standard Next.js prefetch
          router.prefetch(page);

          // Explicitly fetch RSC payload to ensure it's in the cache
          const rscUrl = `${page}${page.includes('?') ? '&' : '?'}_rsc`;
          fetch(rscUrl, { headers: { RSC: '1' } }).catch(() => {});

          // Aggressively load the offline fallback in an iframe to force chunk loading.
          // This is especially important in development/Turbopack where prefetch
          // might not fetch all transitive dependencies/chunks.
          if (page === '/~offline') {
            const iframe = document.createElement('iframe');
            iframe.src = page;
            iframe.style.display = 'none';
            // Set a unique ID to avoid duplicates if the layout re-renders
            iframe.id = 'offline-prefetch-iframe';

            if (!document.querySelector(`#${iframe.id}`)) {
              document.body.append(iframe);
              console.log('[Offline Prefetch] Injected aggressive prefetch iframe for:', page);
            }
          }
        } catch (error) {
          console.error(`[Offline Prefetch] Failed to prefetch ${page}:`, error);
        }
      }
    }, 5000); // 5s delay to ensure the main page is fully loaded and stable

    return (): void => clearTimeout(timer);
  }, [router]);

  return undefined;
}
