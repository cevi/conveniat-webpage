import {
  FORM_FILE_BUCKET_MARKER,
  type FormFileStore,
  migrateFormFiles,
} from '@/features/payload-cms/payload-cms/initialization/migrate-form-files';
import { isFormFileKey } from '@/lib/form-file-key';
import type { Payload } from 'payload';

const SHARED = 'conveniat-files';
const FORM_FILES = 'conveniat-form-files';

interface StoredFormFile {
  id: string;
  filename: string;
  originalFilename?: string;
  url?: string;
}

/** Buckets in memory: bucket → key → content. */
const createStore = (
  objects: Record<string, Record<string, string>>,
): FormFileStore & { buckets: Map<string, Map<string, string>> } => {
  const buckets = new Map(
    Object.entries(objects).map(([bucket, keys]) => [bucket, new Map(Object.entries(keys))]),
  );
  const bucket = (name: string): Map<string, string> => {
    const found = buckets.get(name) ?? new Map<string, string>();
    buckets.set(name, found);
    return found;
  };
  return {
    buckets,
    exists: (name, key) => Promise.resolve(bucket(name).has(key)),
    copy: (from, to): Promise<void> => {
      const content = bucket(from.bucket).get(from.key);
      if (content === undefined) return Promise.reject(new Error('NoSuchKey'));
      bucket(to.bucket).set(to.key, content);
      return Promise.resolve();
    },
    remove: (name, key): Promise<void> => {
      bucket(name).delete(key);
      return Promise.resolve();
    },
  };
};

/** Just enough of Payload: the form files, the other uploads' filenames and the KV store. */
const createPayload = (
  formFiles: StoredFormFile[],
  otherUploads: Record<string, string[]> = {},
): { payload: Payload; kv: Map<string, unknown>; formFiles: StoredFormFile[] } => {
  const kv = new Map<string, unknown>();
  const payload = {
    kv: {
      // eslint-disable-next-line unicorn/no-null -- Payload's KV store answers a missing key with null
      get: (key: string) => Promise.resolve(kv.get(key) ?? null),
      set: (key: string, value: unknown) => Promise.resolve(void kv.set(key, value)),
    },
    config: {
      collections: [
        { slug: 'form_collection', upload: {} },
        { slug: 'documents', upload: {} },
        { slug: 'images', upload: { imageSizes: [{ name: 'thumbnail' }] } },
        // Payload's default for a collection without uploads
        { slug: 'users', upload: false },
      ],
    },
    find: () => Promise.resolve({ docs: formFiles.map((file) => ({ ...file })) }),
    count: ({
      collection,
      where,
    }: {
      collection: string;
      where: { or: Record<string, { equals: string }>[] };
    }) => {
      // as Payload, which refuses to query a field a collection does not have
      if (collection === 'users') return Promise.reject(new Error('cannot be queried: filename'));
      const keys = where.or.flatMap((condition) => Object.values(condition).map((c) => c.equals));
      const taken = otherUploads[collection] ?? [];
      return Promise.resolve({ totalDocs: keys.some((key) => taken.includes(key)) ? 1 : 0 });
    },
    db: {
      updateOne: ({
        where,
        data,
      }: {
        where: { and: [{ id: { equals: string } }, { filename: { equals: string } }] };
        data: Partial<StoredFormFile>;
      }) => {
        const [{ id }, { filename }] = where.and;
        const file = formFiles.find(
          (candidate) => candidate.id === id.equals && candidate.filename === filename.equals,
        );
        // eslint-disable-next-line unicorn/no-null -- the adapter answers a miss with null
        if (file === undefined) return Promise.resolve(null);
        Object.assign(file, data);
        return Promise.resolve(file);
      },
    },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  } as unknown as Payload;
  return { payload, kv, formFiles };
};

describe('migrateFormFiles', () => {
  it('moves a form file into its bucket under a random key, named as it was handed in', async () => {
    const store = createStore({ [SHARED]: { 'Hofplan Züri 11.pdf': 'plan' } });
    const { payload, formFiles } = createPayload([{ id: 'f1', filename: 'Hofplan Züri 11.pdf' }]);

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    const [file] = formFiles;
    expect(isFormFileKey(file?.filename ?? '')).toBe(true);
    expect(file?.filename).toMatch(/\.pdf$/);
    expect(file?.originalFilename).toBe('Hofplan Züri 11.pdf');
    expect(file?.url).toBe(`/api/form_collection/file/${file?.filename}`);
    expect(store.buckets.get(FORM_FILES)?.get(file?.filename ?? '')).toBe('plan');
    expect(store.buckets.get(SHARED)?.has('Hofplan Züri 11.pdf')).toBe(false);
  });

  it('leaves the public document whose name a form file was handed in with', async () => {
    const store = createStore({ [SHARED]: { 'lagerregeln.pdf': 'rules' } });
    const { payload, formFiles } = createPayload(
      [{ id: 'f1', filename: 'lagerregeln.pdf', originalFilename: 'lagerregeln.pdf' }],
      { documents: ['lagerregeln.pdf'] },
    );

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(store.buckets.get(SHARED)?.get('lagerregeln.pdf')).toBe('rules');
    expect(store.buckets.get(FORM_FILES)?.get(formFiles[0]?.filename ?? '')).toBe('rules');
  });

  it('leaves an image size whose name a form file was handed in with', async () => {
    const store = createStore({ [SHARED]: { 'zelt-300x200.jpg': 'thumbnail' } });
    const { payload } = createPayload([{ id: 'f1', filename: 'zelt-300x200.jpg' }], {
      images: ['zelt-300x200.jpg'],
    });

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(store.buckets.get(SHARED)?.get('zelt-300x200.jpg')).toBe('thumbnail');
  });

  it('gives form files random keys in the shared bucket when they have no bucket of their own', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload, formFiles } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);

    await migrateFormFiles(payload, store, { formFiles: SHARED, shared: SHARED });

    expect(isFormFileKey(formFiles[0]?.filename ?? '')).toBe(true);
    expect([...(store.buckets.get(SHARED)?.keys() ?? [])]).toEqual([formFiles[0]?.filename]);
  });

  it('does nothing on the next start', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);
    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    const copy = jest.spyOn(store, 'copy');
    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(copy).not.toHaveBeenCalled();
  });

  it('moves a file handed in to a replica of the previous release after the move', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload, kv, formFiles } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);
    kv.set(FORM_FILE_BUCKET_MARKER, FORM_FILES);

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(isFormFileKey(formFiles[0]?.filename ?? '')).toBe(true);
    expect(store.buckets.get(FORM_FILES)?.get(formFiles[0]?.filename ?? '')).toBe('plan');
    expect(store.buckets.get(SHARED)?.has('plan.pdf')).toBe(false);
  });

  it('moves the files again, keeping their keys, when the bucket changes', async () => {
    const key = '3f2b8c1e-5d4a-4b6f-9e7d-1a2b3c4d5e6f.pdf';
    const store = createStore({ [FORM_FILES]: { [key]: 'plan' } });
    const { payload, kv, formFiles } = createPayload([{ id: 'f1', filename: key }]);
    kv.set(FORM_FILE_BUCKET_MARKER, FORM_FILES);

    await migrateFormFiles(payload, store, { formFiles: 'conveniat-hof-files', shared: SHARED });

    expect(formFiles[0]?.filename).toBe(key);
    expect(store.buckets.get('conveniat-hof-files')?.get(key)).toBe('plan');
    expect(store.buckets.get(FORM_FILES)?.has(key)).toBe(false);
  });

  it('leaves a file uploaded into the new bucket while it runs where it is', async () => {
    const key = '3f2b8c1e-5d4a-4b6f-9e7d-1a2b3c4d5e6f.pdf';
    const store = createStore({ [FORM_FILES]: { [key]: 'new' } });
    const { payload, kv } = createPayload([{ id: 'f1', filename: key }]);

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(store.buckets.get(FORM_FILES)?.get(key)).toBe('new');
    expect(kv.get(FORM_FILE_BUCKET_MARKER)).toBe(FORM_FILES);
  });

  it('tries a file that failed to move again on the next start', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload, kv, formFiles } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);
    jest.spyOn(store, 'copy').mockRejectedValueOnce(new Error('SlowDown'));

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });
    expect(formFiles[0]?.filename).toBe('plan.pdf');
    expect(kv.has(FORM_FILE_BUCKET_MARKER)).toBe(false);

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });
    expect(isFormFileKey(formFiles[0]?.filename ?? '')).toBe(true);
    expect(kv.get(FORM_FILE_BUCKET_MARKER)).toBe(FORM_FILES);
  });

  it('leaves a file on its old key when it cannot tell whether another upload uses it', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload, kv, formFiles } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);
    jest.spyOn(payload, 'count').mockRejectedValueOnce(new Error('timeout'));

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(formFiles[0]?.filename).toBe('plan.pdf');
    expect(store.buckets.get(SHARED)?.get('plan.pdf')).toBe('plan');
    expect(kv.has(FORM_FILE_BUCKET_MARKER)).toBe(false);
  });

  it('counts a file as moved when only removing its old object fails', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan' } });
    const { payload, kv, formFiles } = createPayload([{ id: 'f1', filename: 'plan.pdf' }]);
    jest.spyOn(store, 'remove').mockRejectedValueOnce(new Error('SlowDown'));

    await migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED });

    expect(store.buckets.get(FORM_FILES)?.get(formFiles[0]?.filename ?? '')).toBe('plan');
    expect(kv.get(FORM_FILE_BUCKET_MARKER)).toBe(FORM_FILES);
  });

  it('leaves one object per file when two replicas start at once', async () => {
    const store = createStore({ [SHARED]: { 'plan.pdf': 'plan', 'budget.xlsx': 'budget' } });
    const { payload, formFiles } = createPayload([
      { id: 'f1', filename: 'plan.pdf' },
      { id: 'f2', filename: 'budget.xlsx' },
    ]);

    await Promise.all([
      migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED }),
      migrateFormFiles(payload, store, { formFiles: FORM_FILES, shared: SHARED }),
    ]);

    const stored = [...(store.buckets.get(FORM_FILES)?.keys() ?? [])].toSorted();
    expect(stored).toEqual(formFiles.map((file) => file.filename).toSorted());
    expect(store.buckets.get(SHARED)?.size).toBe(0);
  });
});
