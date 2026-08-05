'use client';

import type React from 'react';
import { useEffect } from 'react';

/**
 * @fileoverview Global Error Handler for Next.js / Turbopack Chunk Mismatches & Service Worker Stale Precache Recovery.
 *
 * ### Production Infrastructure & Server Caching Architecture
 * In our production infrastructure (see {@link file:///home/pucyril/projects/conveniat-webpage/nginx/nginx.conf#L87-L123 | nginx/nginx.conf}):
 * 1. **Cumulative Asset Storage (`/var/www/next-static/`)**: Nginx mounts a persistent volume to preserve static chunk files
 *    from prior builds across Docker container redeployments (`try_files $uri @nextjs_static`).
 * 2. **Fallback Empty 404 Handler (`/empty_404`)**: If a JS chunk is missing on disk and upstream, Nginx returns a 404 JavaScript payload
 *    (404 Not Found) with `Content-Type: application/javascript` instead of an HTML error page, preventing Unexpected token HTML syntax errors.
 *
 * ### Why Chunk & Module Factory Errors Still Occur
 * Despite cumulative server storage, deployment updates (e.g. Next.js upgrades or Turbopack re-bundling) regenerate internal
 * module IDs and chunk hashes.
 *
 * When long-lived client browser sessions or mobile PWA WebViews (e.g. `KonektaApp/1.0` Android/iOS native WebViews) run a
 * **stale Service Worker precache** or **stale HTML shell in memory** from a previous build while attempting to load newly deployed
 * entrypoints or dynamic routes, a runtime mismatch occurs between loaded module registries and chunk factories.
 *
 * ### Common Error Symptoms Handled
 * 1. **Turbopack Missing Module Factory Error**:
 *    `Module X was instantiated because it was required from module Y, but the module factory is not available.`
 *    Occurs when Turbopack attempts to load a required module whose internal factory ID is not registered in the client's current bundle map.
 * 2. **Unexpected HTML Syntax Error**:
 *    `Uncaught SyntaxError: Unexpected token '<'`
 *    Occurs if a proxy or CDN returns an HTML error page for a missing `.js` asset.
 * 3. **Webpack & Dynamic Import Failures**:
 *    `ChunkLoadError: Loading chunk X failed` or `Failed to fetch dynamically imported module`.
 * 4. **Serwist SW Precache Invalidation Error**:
 *    `bad-precaching-response`
 *    Occurs when Serwist Service Worker precaching encounters an outdated or invalid asset manifest entry.
 *
 * ### Recovery Strategy & Logic
 * 1. **Online Guard**: Ignores errors if `!navigator.onLine` so actual network drops are handled by Next.js Network Resilience
 *    (`experimental.useOffline`) and Serwist offline fallbacks rather than triggering reloads.
 * 2. **Precache Cleanup**: If a Service Worker precache corruption or missing module factory error is detected,
 *    it unregisters active Service Worker registrations via `navigator.serviceWorker.getRegistrations()` to ensure
 *    stale precaches are purged.
 * 3. **Hard Navigation Reload**: Triggers `globalThis.location.reload()`, fetching the latest `index.html` and
 *    updated Turbopack bundle manifest from the server.
 * 4. **Anti-Loop Guard**: Enforces a 10-second threshold via `sessionStorage` (`chunk_reload_time`) to prevent infinite
 *    reload loops if an unhandled runtime error is genuine rather than chunk-related.
 *
 * ### Reference Documentation & Online Sources
 * @see {@link file:///home/pucyril/projects/conveniat-webpage/nginx/nginx.conf#L87-L123 | Project Nginx Static Asset Cache Configuration}
 * @see {@link https://nextjs.org/docs/app/building-your-application/deploying | Next.js Production Deployment & Asset Caching Guide}
 * @see {@link https://nextjs.org/blog/next-16-3-instant-navigations | Next.js 16.3 Instant Navigations & Asset Management}
 * @see {@link https://serwist.pages.dev/docs/next/worker | Serwist Service Worker Next.js Integration}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/unregister | MDN ServiceWorkerRegistration.unregister()}
 */
export const ChunkErrorHandler: React.FC = () => {
  useEffect(() => {
    const triggerReloadIfNeeded = (error: unknown, message: string): void => {
      if (!navigator.onLine) {
        console.warn(
          '[ChunkErrorHandler] Offline: Ignoring chunk error to prevent reload loop.',
          error,
        );
        return;
      }

      let errorMessage = message;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      const isSyntaxError =
        (error instanceof SyntaxError && errorMessage.includes("Unexpected token '<'")) ||
        errorMessage.includes("Unexpected token '<'");

      const isChunkLoadError =
        (error as Error | null)?.name === 'ChunkLoadError' ||
        errorMessage.includes('ChunkLoadError') ||
        errorMessage.includes('Failed to load chunk') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('bad-precaching-response') ||
        errorMessage.includes('module factory is not available') ||
        errorMessage.includes('was instantiated because') ||
        errorMessage.includes('Failed to fetch dynamically imported module');

      if (isSyntaxError || isChunkLoadError) {
        console.warn(
          '[ChunkErrorHandler] Chunk load error detected! Reloading page to fetch updated assets...',
          error,
        );

        const lastReload = sessionStorage.getItem('chunk_reload_time');
        const now = Date.now();

        if (lastReload !== null && now - Number(lastReload) < 10_000) {
          console.error('[ChunkErrorHandler] Reload loop detected, stopping auto-reload.');
          return;
        }

        sessionStorage.setItem('chunk_reload_time', String(now));

        const shouldResetSW =
          (errorMessage.includes('bad-precaching-response') ||
            errorMessage.includes('module factory is not available')) &&
          'serviceWorker' in navigator;

        if (shouldResetSW) {
          void navigator.serviceWorker
            .getRegistrations()
            .then((registrations) => {
              for (const registration of registrations) {
                void registration.unregister();
              }
              globalThis.location.reload();
            })
            .catch(() => {
              globalThis.location.reload();
            });
        } else {
          globalThis.location.reload();
        }
      }
    };

    const handleError = (event: ErrorEvent): void => {
      triggerReloadIfNeeded(event.error, event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as unknown;
      const message = reason instanceof Error ? reason.message : String(reason);
      triggerReloadIfNeeded(reason, message);
    };

    globalThis.addEventListener('error', handleError);
    globalThis.addEventListener('unhandledrejection', handleUnhandledRejection);

    return (): void => {
      globalThis.removeEventListener('error', handleError);
      globalThis.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // eslint-disable-line unicorn/no-null
};
