import type { BillArchivePort } from '@/features/billing/ports/bill-archive.port';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Files bills into a directory that the `abraunegg/onedrive` sidecar syncs to OneDrive.
 *
 * The app never speaks to OneDrive. Microsoft only offers us a personal account — the
 * organisation cannot issue service principals — so the OAuth token has to be minted by a
 * human once and then refreshed forever. Owning that flow in the app would mean owning
 * token refresh, throttling, resumable uploads and retries; the sidecar already does all of
 * it, and it fails in a place an operator can see. Here a bill is just a file written to a
 * directory.
 *
 * Writes land under a temporary name and are renamed into place. The sidecar watches the
 * directory with inotify and would otherwise happily upload a half-written PDF, since a
 * rename is the only filesystem operation it sees as atomic.
 */
export class OneDriveSpoolAdapter implements BillArchivePort {
  private readonly root: string;

  constructor(rootDirectory: string | undefined) {
    this.root = typeof rootDirectory === 'string' ? rootDirectory.trim() : '';
  }

  get isEnabled(): boolean {
    return this.root !== '';
  }

  async archive(relativePath: string, content: Buffer): Promise<void> {
    if (!this.isEnabled) return;

    const target = path.resolve(this.root, relativePath);
    // The path is built from participant and event names, so it is worth making sure a
    // stray separator cannot walk the write out of the spool.
    const rootWithSeparator = path.resolve(this.root) + path.sep;
    if (!target.startsWith(rootWithSeparator)) {
      throw new Error(`Refusing to archive outside the spool directory: ${relativePath}`);
    }

    await fs.mkdir(path.dirname(target), { recursive: true });

    const temporary = `${target}.part-${String(process.pid)}-${String(Date.now())}`;
    try {
      await fs.writeFile(temporary, content);
      await fs.rename(temporary, target);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {
        // The write already failed; a leftover .part file is not worth masking it for.
      });
      throw error;
    }
  }
}

/** Used when no archive is configured, so callers need no branch of their own. */
export class NoopBillArchiveAdapter implements BillArchivePort {
  readonly isEnabled = false;

  async archive(): Promise<void> {
    // Nothing to file into.
  }
}
