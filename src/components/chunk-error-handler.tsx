'use client';

import type React from 'react';
import { useEffect } from 'react';

/**
 * Global Error Handler for "Chunk Load Errors"
 *
 * THE PROBLEM:
 * When we deploy a new version of the app (via Docker), the old JavaScript chunks (e.g., `chunk-123.js`)
 * are deleted from the server.
 *
 * However, users who already have the site open are still running the *old* index.html, which references these
 * now-missing files. When they try to navigate or lazy-load a component, the browser requests the old chunk.
 *
 * THE SYMPTOMS:
 * 1. The server returns a 404.
 * 2. Next.js often returns a custom 404 HTML page instead of the expected JS file.
 * 3. The browser tries to parse this HTML as JS and crashes with: "Uncaught SyntaxError: Unexpected token '<'"
 * 4. Or, if the server returns a proper 404, Webpack throws a "ChunkLoadError".
 *
 * THE SOLUTION:
 * This component listens for these specific global errors. If detected, it forces a hard reload of the page.
 * This fetches the NEW `index.html` from the server, which references the NEW correct chunk filenames,
 * effectively updating the user to the latest version automatically.
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
        globalThis.location.reload();
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
