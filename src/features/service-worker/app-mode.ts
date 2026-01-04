// Persistent storage for App Mode client IDs
export const APP_MODE_CACHE_NAME = 'app-mode-persistence-v1';
export const APP_MODE_STORAGE_KEY = '/app-mode-clients';

let appModeClients = new Set<string>();
let isInitialized = false;

/**
 * Loads the persisted App Mode client IDs from the cache.
 */
export async function ensureAppModeInitialized(): Promise<void> {
  if (isInitialized) return;
  try {
    const cache = await caches.open(APP_MODE_CACHE_NAME);
    const response = await cache.match(APP_MODE_STORAGE_KEY);
    if (response) {
      const persistedIds = (await response.json()) as string[];
      appModeClients = new Set(persistedIds);
    }
  } catch (error) {
    console.error('[SW] Failed to load persistent app mode clients:', error);
  } finally {
    isInitialized = true;
  }
}

/**
 * Persists the current App Mode client IDs to the cache.
 */
export async function persistAppModeClients(): Promise<void> {
  try {
    const cache = await caches.open(APP_MODE_CACHE_NAME);
    await cache.put(
      APP_MODE_STORAGE_KEY,
      new Response(JSON.stringify([...appModeClients]), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch (error) {
    console.error('[SW] Failed to persist app mode clients:', error);
  }
}

/**
 * Prunes inactive client IDs from the persistent storage.
 */
export async function pruneInactiveAppModeClients(self: ServiceWorkerGlobalScope): Promise<void> {
  await ensureAppModeInitialized();
  const currentClients = await self.clients.matchAll();
  const currentClientIds = new Set(currentClients.map((client) => client.id));

  const initialSize = appModeClients.size;
  for (const id of appModeClients) {
    if (!currentClientIds.has(id)) {
      appModeClients.delete(id);
    }
  }

  if (appModeClients.size !== initialSize) {
    await persistAppModeClients();
  }
}

export function isClientInAppMode(clientId: string): boolean {
  return appModeClients.has(clientId);
}

export function addAppModeClient(clientId: string): void {
  appModeClients.add(clientId);
}
