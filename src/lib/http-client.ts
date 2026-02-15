import 'server-only';
import { Agent, setGlobalDispatcher } from 'undici';

// Configure Global Agent once
export function initHttpClient(): void {
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 10_000,
      keepAliveMaxTimeout: 10_000,
      headersTimeout: 10_000,
      bodyTimeout: 30_000,
      connect: { timeout: 10_000, keepAlive: true },
      pipelining: 0,
      connections: 50,
    }),
  );
}

/**
 * Helper function to perform fetch with retries for network errors.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    const startTime = performance.now();
    try {
      return await fetch(url, { ...options, cache: 'no-store' });
    } catch (error) {
      attempt++;
      const duration = (performance.now() - startTime).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      console.warn(
        `[NextAuth] Fetch attempt ${attempt} failed for ${url} after ${duration}ms. Error: [${errorName}] ${errorMessage}`,
      );

      if (errorName === 'AbortError' || errorMessage.includes('aborted')) {
        console.warn(`[NextAuth] Detailed AbortError info for ${url}:`, {
          error,
          stack: error instanceof Error ? error.stack : 'No stack available',
        });
      }

      if (attempt >= retries) throw error;
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable code in fetchWithRetry');
}
