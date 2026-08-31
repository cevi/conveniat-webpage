import { environmentVariables } from '@/config/environment-variables';
import { resolveBillPdfBucket } from '@/lib/storage-buckets';
import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';

const MINIO_HOST = environmentVariables.MINIO_HOST;
const MINIO_BUCKET_NAME = environmentVariables.MINIO_BUCKET_NAME;
const MINIO_ACCESS_KEY_ID = environmentVariables.MINIO_ACCESS_KEY_ID;
const MINIO_SECRET_ACCESS_KEY = environmentVariables.MINIO_SECRET_ACCESS_KEY;

/**
 * S3 Storage Plugin Configuration
 * We use a MinIO instance for storing files and images.
 *
 * @see https://www.npmjs.com/package/@payloadcms/storage-s3
 */
const connection = {
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY_ID,
    secretAccessKey: MINIO_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
  endpoint: MINIO_HOST,
};

const BILL_PDF_BUCKET = resolveBillPdfBucket(
  environmentVariables.MINIO_BILL_PDF_BUCKET_NAME,
  MINIO_BUCKET_NAME,
);

/**
 * Bill PDFs get their own plugin instance because the plugin takes one bucket for all the
 * collections it is given. When no separate bucket is configured this resolves to the
 * shared one, and the two instances behave exactly as the single one used to.
 */
const billPdfStorageConfiguration = s3Storage({
  collections: { 'bill-pdfs': true },
  bucket: BILL_PDF_BUCKET,
  config: connection,
});

export const s3StorageConfiguration = s3Storage({
  collections: {
    images: true,
    documents: true,
    userSubmittedImages: true,
    'chat-images': true,
    form_collection: true,

    // The import/export plugin registers these two as upload collections without a staticDir, so
    // Payload defaults it to the collection slug - a *relative* path resolved against the process
    // CWD. In the container that is /app, which the app user cannot write to, so every CSV import
    // failed with `EACCES: permission denied, mkdir 'imports'` (a 500 on POST /api/imports).
    // Routing them through MinIO like every other upload collection removes the local write.
    imports: true,
    exports: true,
  },
  bucket: MINIO_BUCKET_NAME,
  config: connection,
});

/**
 * Both storage instances, in the order they should be registered. Everything except the
 * bill PDFs goes to the shared bucket; the bills go wherever
 * `MINIO_BILL_PDF_BUCKET_NAME` points, or the shared bucket when it is unset.
 */
export const s3StoragePlugins: Plugin[] = [s3StorageConfiguration, billPdfStorageConfiguration];
