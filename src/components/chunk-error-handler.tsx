'use client';

import type React from 'react';
import { useEffect } from 'react';

/**
 * @fileoverview Global Error Handler for Next.js / Turbopack Chunk Invalidation & Service Worker Stale Precache Recovery.
 *
 * ### Architectural Problem & Context
 * When a new build of the application is deployed (e.g. via Docker or continuous deployment pipelines),
 * Next.js and Turbopack generate new JavaScript bundle chunks with new content-hashed file names under
 * `/_next/static/chunks/...` or `/_next/static/immutable/...`.
 *
 * Previous build chunk files on the server are removed or invalidated.
 *
 * However, long-lived client browser sessions or mobile PWA WebViews (e.g. Android/iOS native WebViews)
 * may still be running a cached DOM / JS runtime from the previous build. When the user navigates to a new page,
 * triggers a client-side route transition, or lazy-loads a component, the browser attempts to fetch the old chunk file.
 *
 * ### Common Error Symptoms Handled
 * 1. **Turbopack Missing Module Factory Error**:
 *    `Module X was instantiated because it was required from module Y, but the module factory is not available.`
 *    Occurs when Turbopack attempts to load a required module whose enclosing chunk bundle is missing or stale.
 * 2. **Unexpected HTML Syntax Error**:
 *    `Uncaught SyntaxError: Unexpected token '<'`
 *    Occurs when the server (or Service Worker) returns a 404 HTML fallback page for a missing `.js` asset,
 *    and the browser attempts to parse HTML as JavaScript.
 * 3. **Webpack & Dynamic Import Failures**:
 *    `ChunkLoadError: Loading chunk X failed` or `Failed to fetch dynamically imported module`.
 * 4. **Serwist SW Precache Invalidation Error**:
 *    `bad-precaching-response`
 *    Occurs when Serwist Service Worker precaching encounters an outdated or invalid asset manifest entry.
 *
 * ### Recovery Strategy & Logic
 * 1. **Online Guard**: Ignores errors if `!navigator.onLine` so actual offline network drops are handled by
 *    Next.js Network Resilience (`experimental.useOffline`) and Serwist offline fallbacks rather than triggering reloads.
 * 2. **Precache Cleanup**: If a Service Worker precache corruption or missing module factory error is detected,
 *    it unregisters active Service Worker registrations via `navigator.serviceWorker.getRegistrations()` to ensure
 *    stale caches are cleared.
 * 3. **Hard Navigation Reload**: Triggers `globalThis.location.reload()`, fetching the latest `index.html` and
 *    updated chunk manifest from the server.
 * 4. **Anti-Loop Guard**: Enforces a 10-second threshold via `sessionStorage` (`chunk_reload_time`) to prevent infinite
 *    reload loops if an unhandled runtime error is genuine rather than chunk-related.
 *
 * ### Reference Documentation & Online Sources
 * @see {@link https://nextjs.org/docs/app/building-your-application/deploying | Next.js Deployment & Production Caching Guide}
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
