import {
  NoopBillArchiveAdapter,
  OneDriveSpoolAdapter,
} from '@/features/billing/adapters/onedrive-spool.adapter';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('OneDriveSpoolAdapter', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'bill-archive-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes the bill and creates the folders it needs', async () => {
    const adapter = new OneDriveSpoolAdapter(root);

    await adapter.archive('2027/Hof Süd/Rechnung-2027-0001_Max Muster.pdf', Buffer.from('%PDF-'));

    const written = await fs.readFile(
      path.join(root, '2027/Hof Süd/Rechnung-2027-0001_Max Muster.pdf'),
    );
    expect(written.toString()).toBe('%PDF-');
  });

  it('leaves no partial file behind, so the sync client never sees one', async () => {
    const adapter = new OneDriveSpoolAdapter(root);

    await adapter.archive('2027/Rechnung.pdf', Buffer.from('%PDF-'));

    const entries = await fs.readdir(path.join(root, '2027'));
    expect(entries).toEqual(['Rechnung.pdf']);
  });

  it('overwrites a re-sent bill rather than duplicating it', async () => {
    const adapter = new OneDriveSpoolAdapter(root);

    await adapter.archive('2027/Rechnung.pdf', Buffer.from('first'));
    await adapter.archive('2027/Rechnung.pdf', Buffer.from('second'));

    expect(await fs.readdir(path.join(root, '2027'))).toEqual(['Rechnung.pdf']);
    const rewritten = await fs.readFile(path.join(root, '2027/Rechnung.pdf'));
    expect(rewritten.toString()).toBe('second');
  });

  it('refuses to write outside the spool', async () => {
    const adapter = new OneDriveSpoolAdapter(root);

    await expect(adapter.archive('../escaped.pdf', Buffer.from('%PDF-'))).rejects.toThrow(
      /outside the spool/,
    );
    await expect(fs.readdir(root)).resolves.toEqual([]);
  });

  it('is disabled, and silent, when no directory is configured', async () => {
    const adapter = new OneDriveSpoolAdapter(undefined);

    expect(adapter.isEnabled).toBe(false);
    await expect(
      adapter.archive('2027/Rechnung.pdf', Buffer.from('%PDF-')),
    ).resolves.toBeUndefined();
  });

  it('treats a blank directory as not configured', () => {
    expect(new OneDriveSpoolAdapter('   ').isEnabled).toBe(false);
  });
});

describe('NoopBillArchiveAdapter', () => {
  it('reports itself disabled and does nothing', async () => {
    const adapter = new NoopBillArchiveAdapter();
    expect(adapter.isEnabled).toBe(false);
    await expect(adapter.archive()).resolves.toBeUndefined();
  });
});
