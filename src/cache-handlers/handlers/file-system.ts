import { BaseCacheHandler } from '@/cache-handlers/handlers/base';
import type { CacheEntry } from '@/cache-handlers/types';
import { createLogger } from '@/utils/server-logger';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const logger = createLogger('cache:file-system');

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD || process.argv.includes('build');

const FALLBACK_CACHE_DIR = path.join(process.cwd(), '.next/cache/fs-fallback');

export class FileSystemCache extends BaseCacheHandler {
  name = 'FileSystem';

  constructor() {
    super();
    if (isBuild) {
      logger.info('Initialized for BUILD (write enabled)');
      try {
        mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
      } catch (error) {
        logger.error('Failed to create cache dir', { 'cache.dir': FALLBACK_CACHE_DIR, error });
      }
    } else {
      logger.info('Initialized for RUNTIME (read-only)');

      // list cache content
      try {
        if (existsSync(FALLBACK_CACHE_DIR)) {
          const files = readdirSync(FALLBACK_CACHE_DIR);
          logger.debug('Cache directory contents', {
            'cache.dir': FALLBACK_CACHE_DIR,
            'cache.files': files.length,
          });
        } else {
          logger.warn('Cache directory does not exist', { 'cache.dir': FALLBACK_CACHE_DIR });
        }
      } catch (error) {
        logger.error('Failed to read cache dir', { 'cache.dir': FALLBACK_CACHE_DIR, error });
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
      logger.error('GET failed', { 'cache.key': key, error });
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

      logger.debug('Written', { 'cache.key': key });
    } catch (error) {
      logger.error('SET failed', { 'cache.key': key, error });
    }
  }

  async invalidateTags(): Promise<void> {
    // FS is immutable
  }
}
