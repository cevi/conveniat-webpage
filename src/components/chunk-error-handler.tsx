'use client';

import { useEffect, type ReactNode } from 'react';

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
export const ChunkErrorHandler = (): ReactNode => {
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      // Check for the "Unexpected token '<'" SyntaxError (which happens when HTML is served as JS)
      const isSyntaxError =
        event.error instanceof SyntaxError && event.error.message.includes("Unexpected token '<'");

      // Check for standard Webpack ChunkLoadError
      const isChunkLoadError =
        (event.error as Error | null)?.name === 'ChunkLoadError' ||
        event.message.includes('Loading chunk');

      if (isSyntaxError || isChunkLoadError) {
        console.warn(
          'Chunk load error detected! Reloading page to pick up new version...',
          event.error,
        );

        // Prevent infinite reload loops: check if we just reloaded
        const lastReload = sessionStorage.getItem('chunk_reload_time');
        const now = Date.now();

        if (lastReload && now - Number(lastReload) < 10_000) {
          console.error('Reload loop detected, stopping auto-reload.');
          return;
        }

        sessionStorage.setItem('chunk_reload_time', String(now));
        globalThis.location.reload();
      }
    };

    globalThis.addEventListener('error', handleError);
    return (): void => globalThis.removeEventListener('error', handleError);
  }, []);

  return null; // eslint-disable-line unicorn/no-null
};
