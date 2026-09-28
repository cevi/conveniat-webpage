import { formFileKey, isFormFileKey } from '@/lib/form-file-key';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  type S3Client,
} from '@aws-sdk/client-s3';
import type { Payload, SanitizedUploadConfig } from 'payload';

/** The bucket operations the move needs, so it can run against a store other than S3. */
export interface FormFileStore {
  exists(bucket: string, key: string): Promise<boolean>;
  copy(from: { bucket: string; key: string }, to: { bucket: string; key: string }): Promise<void>;
  remove(bucket: string, key: string): Promise<void>;
}

/** The store backed by an S3 client. */
export const s3FormFileStore = (client: S3Client): FormFileStore => ({
  exists: async (bucket, key): Promise<boolean> => {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (error) {
      if (error instanceof NotFound) return false;
      throw error;
    }
  },
  copy: async (from, to): Promise<void> => {
    await client.send(
      new CopyObjectCommand({
        CopySource: `${from.bucket}/${encodeURIComponent(from.key)}`,
        Bucket: to.bucket,
        Key: to.key,
      }),
    );
  },
  remove: async (bucket, key): Promise<void> => {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
});

/** Where the last completed move put the form files; unset before the first one. */
export const FORM_FILE_BUCKET_MARKER = 'form-files:bucket';

/**
 * Whether an upload collection other than the form files holds an object under this key. Form
 * files used to be stored in the shared bucket under the name they were handed in with, so one
 * may carry the name of a public image or document, and then the object is also that one.
 */
const isKeyOfAnotherUpload = async (payload: Payload, key: string): Promise<boolean> => {
  for (const collection of payload.config.collections) {
    // typed as always there, but Payload sets it to false on a collection without uploads
    const upload = collection.upload as SanitizedUploadConfig | false;
    if (collection.slug === 'form_collection' || upload === false) continue;
    const imageSizes = upload.imageSizes ?? [];
    const { totalDocs } = await payload.count({
      collection: collection.slug,
      where: {
        or: [
          { filename: { equals: key } },
          ...imageSizes.map((size) => ({ [`sizes.${size.name}.filename`]: { equals: key } })),
        ],
      },
      overrideAccess: true,
    });
    if (totalDocs > 0) return true;
  }
  return false;
};

/**
 * Moves every form file into the form file bucket under a key of its own.
 *
 * Form files used to be stored in the shared bucket under the name they were handed in with, so
 * a participant could pick the name of a public image and overwrite it. They now live in their
 * own bucket, when one is configured, under a random key. This moves the files stored before
 * that, and all of them again whenever the bucket is changed, and records where it put them.
 * Afterwards a start only looks for files still stored under a name they were handed in with,
 * which a replica of the previous release writes while a deployment rolls out.
 *
 * Safe on several replicas at once: a document is switched to its new key only if it still
 * holds the old one, and the replica that loses that race removes its copy. The old object is
 * kept when another upload still uses the key.
 */
export const migrateFormFiles = async (
  payload: Payload,
  store: FormFileStore,
  buckets: { formFiles: string; shared: string },
): Promise<void> => {
  const target = buckets.formFiles;
  const marker = await payload.kv.get<string>(FORM_FILE_BUCKET_MARKER);
  // every file, when they have not all been moved into this bucket yet
  const sweep = marker !== target;
  // where a file may still be: where the last move put it, or where every file used to be
  const sources = [...new Set([marker ?? buckets.shared, buckets.shared, target])];

  const { docs } = await payload.find({
    collection: 'form_collection',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { filename: true, originalFilename: true },
  });

  let moved = 0;
  let failed = 0;
  for (const document of docs) {
    const oldKey = document.filename;
    if (typeof oldKey !== 'string' || oldKey === '') continue;
    // a random key is only ever written into the bucket the marker names
    if (!sweep && isFormFileKey(oldKey)) continue;
    const newKey = isFormFileKey(oldKey) ? oldKey : formFileKey(oldKey);

    try {
      // the file may already be where it belongs, e.g. uploaded while this runs
      let source: string | undefined;
      for (const bucket of sources) {
        if (await store.exists(bucket, oldKey)) {
          source = bucket;
          break;
        }
      }
      if (source === undefined) {
        payload.logger.warn({ fileId: document.id }, 'A form file has no object to move');
        continue;
      }
      if (source === target && newKey === oldKey) continue;
      // Decided before the switch: once the document holds the new key, nothing leads back to
      // the old object, so no failure after it may be left to a retry.
      const removeOld = source !== buckets.shared || !(await isKeyOfAnotherUpload(payload, oldKey));

      await store.copy({ bucket: source, key: oldKey }, { bucket: target, key: newKey });
      // typed as always a document, but null when it no longer holds the old key
      const switched: unknown = await payload.db.updateOne({
        collection: 'form_collection',
        where: { and: [{ id: { equals: document.id } }, { filename: { equals: oldKey } }] },
        data: {
          filename: newKey,
          url: `/api/form_collection/file/${newKey}`,
          originalFilename: document.originalFilename ?? oldKey,
        },
      });
      if (switched === null) {
        // another replica moved it first
        if (newKey !== oldKey) await store.remove(target, newKey);
        continue;
      }

      moved += 1;
      if (removeOld) {
        await store.remove(source, oldKey).catch((error: unknown) => {
          payload.logger.warn(
            { err: error, bucket: source, key: oldKey },
            'Left the old object of a moved form file behind',
          );
        });
      }
    } catch (error) {
      failed += 1;
      payload.logger.error({ err: error, fileId: document.id }, 'Moving a form file failed');
    }
  }

  // a file that failed is retried on the next start, from where it still is
  if (sweep && failed === 0) await payload.kv.set(FORM_FILE_BUCKET_MARKER, target);
  if (sweep || moved > 0 || failed > 0) {
    payload.logger.info(
      { moved, failed, bucket: target },
      'Moved the form files into their bucket',
    );
  }
};
