import { BaseCacheHandler } from '@/cache-handlers/handlers/base';
import type { CacheEntry } from '@/cache-handlers/types';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOG_PREFIX = '[FileSystemCache]';

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD || process.argv.includes('build');

const FALLBACK_CACHE_DIR = path.join(process.cwd(), '.next/cache/fs-fallback');

export class FileSystemCache extends BaseCacheHandler {
  name = 'FileSystem';

  constructor() {
    super();
    if (isBuild) {
      console.log(`${LOG_PREFIX} Initialized for BUILD (Write Enabled)`);
      try {
        mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to create cache dir:`, error);
      }
    } else {
      console.log(`${LOG_PREFIX} Initialized for RUNTIME (Read-Only)`);

      // list cache content
      try {
        const files = mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
        console.log(`${LOG_PREFIX} Cache directory contents:`, files);
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to read cache dir:`, error);
      }
    }
  }

  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    return path.join(FALLBACK_CACHE_DIR, `${hash}.json`);
  }

  async get(key: string): Promise<{ value: Buffer; metadata?: Partial<CacheEntry> } | undefined> {
    try {
      const filePath = this.getFilePath(key);
      try {
        await access(filePath);
      } catch {
        return;
      }

      const rawData = await readFile(filePath);
      return this.deserialize(rawData);
    } catch (error) {
      console.error(`${LOG_PREFIX} GET ERROR: ${key}`, error);
      return;
    }
  }

  async set(key: string, value: Buffer, metadata: CacheEntry): Promise<void> {
    if (!isBuild) return;

    try {
      const filePath = this.getFilePath(key);
      const finalBuffer = this.serialize(value, metadata);

      const temporaryPath = `${filePath}.tmp.${randomBytes(4).toString('hex')}`;

      await writeFile(temporaryPath, finalBuffer);
      await rename(temporaryPath, filePath);

      console.log(`${LOG_PREFIX} WRITTEN: ${key}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} SET ERROR: ${key}`, error);
    }
  }

  async invalidateTags(): Promise<void> {
    // FS is immutable
  }
}
