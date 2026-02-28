import type { SerwistPlugin } from 'serwist';

/**
 * A custom Serwist plugin designed specifically for safely caching React Server Component
 * (RSC) Flight streams.
 *
 * RSC payloads are streamed chunk-by-chunk over the network. If a Service Worker aggressively
 * caches an active stream (using `cache.put()`) while the HTTP connection is still open or
 * abruptly terminated, it risks saving a truncated representation of the Flight data to the cache.
 *
 * A truncated cache response causes the Next.js Client-Side router to hang indefinitely waiting
 * for the rest of the stream that will never arrive.
 *
 * This plugin creates a "Buffer-then-Cache" strategy:
 * It clones the stream response and eagerly reads the entire body into memory (`arrayBuffer()`).
 * - If the stream completes successfully, it reconstructs the response and allows the cache write.
 * - If the stream aborts, errors out, or truncates, the `arrayBuffer()` promise rejects, we catch the
 *   error, and return `null`, safely aborting the cache mutation.
 */
export const safeRscCachePlugin: SerwistPlugin = {
  cacheWillUpdate: async ({ response }): Promise<Response | null> => {
    if (response.status !== 200) {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }

    try {
      // Clone the response so we can consume the body without affecting the original stream being sent to the browser
      const clonedResponse = response.clone();

      // Forcing the resolution of the entire stream into memory.
      // If the network drops or the stream truncates mid-flight, this promise will throw an error.
      const buffer = await clonedResponse.arrayBuffer();

      // If we reach here, the stream finished perfectly intact.
      // We must reconstruct a new Response object using the buffer to pass back to the Serwist Cache writer.
      return new Response(buffer, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      console.warn(
        '[SW] Safe RSC Plugin intercepted a truncated stream. Aborting cache write to prevent infinite loading state.',
        error,
      );
      // Returning null tells Serwist NOT to update the cache with this response
      // eslint-disable-next-line unicorn/no-null
      return null;
    }
  },
};
