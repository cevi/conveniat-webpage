import type { RuntimeCaching } from 'serwist';

/**
 * Interface for registering feature-specific offline capabilities.
 */
export interface FeatureOfflineConfig {
  /**
   * Static assets to be precached.
   */
  precacheAssets?: string[];

  /**
   * Custom runtime caching rules for API calls.
   */
  runtimeCaching?: RuntimeCaching[];

  /**
   * URLs that should be aggressively prefetched when the app is online.
   */
  prefetchUrls?: string[];

  /**
   * Logic to handle background synchronization when connectivity is restored.
   */
  onSync?: () => Promise<void>;
}

/**
 * Registry that manages all offline feature configurations.
 */
class OfflineRegistry {
  private configs: Map<string, FeatureOfflineConfig> = new Map();

  /**
   * Register a new feature for offline support.
   */
  register(name: string, config: FeatureOfflineConfig): void {
    console.log(`[OfflineRegistry] Registering feature: ${name}`);
    this.configs.set(name, config);
  }

  /**
   * Get all registered precache assets.
   */
  getPrecacheAssets(): string[] {
    const assets = new Set<string>();
    for (const config of this.configs.values()) {
      if (config.precacheAssets) for (const asset of config.precacheAssets) assets.add(asset);
    }
    return [...assets];
  }

  /**
   * Get all registered runtime caching rules.
   */
  getRuntimeCaching(): RuntimeCaching[] {
    const rules: RuntimeCaching[] = [];
    for (const config of this.configs.values()) {
      if (config.runtimeCaching) {
        rules.push(...config.runtimeCaching);
      }
    }
    return rules;
  }

  /**
   * Get all registered prefetch URLs.
   */
  getPrefetchUrls(): string[] {
    const urls = new Set<string>();
    for (const config of this.configs.values()) {
      if (config.prefetchUrls) for (const url of config.prefetchUrls) urls.add(url);
    }
    return [...urls];
  }

  /**
   * Execute all registered sync handlers.
   */
  async triggerSync(): Promise<void> {
    console.log('[OfflineRegistry] Triggering background sync...');
    for (const [name, config] of this.configs) {
      if (config.onSync) {
        try {
          await config.onSync();
          console.log(`[OfflineRegistry] Sync completed for: ${name}`);
        } catch (error) {
          console.error(`[OfflineRegistry] Sync failed for: ${name}`, error);
        }
      }
    }
  }
}

export const offlineRegistry = new OfflineRegistry();
