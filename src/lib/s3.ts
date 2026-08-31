import { environmentVariables } from '@/config/environment-variables';
import { resolveBillPdfBucket } from '@/lib/storage-buckets';
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: environmentVariables.MINIO_ACCESS_KEY_ID,
    secretAccessKey: environmentVariables.MINIO_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
  endpoint: environmentVariables.MINIO_HOST,
});

/**
 * S3 Client for generating pre-signed URLs that are accessible from the browser.
 * Uses MINIO_PUBLIC_HOST instead of internal MINIO_HOST.
 */
export const s3ClientPublic = new S3Client({
  credentials: {
    accessKeyId: environmentVariables.MINIO_ACCESS_KEY_ID,
    secretAccessKey: environmentVariables.MINIO_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
  endpoint: environmentVariables.MINIO_PUBLIC_HOST,
});

export const MINIO_BUCKET_NAME = environmentVariables.MINIO_BUCKET_NAME;

/**
 * Bucket for bill PDFs — its own when configured, otherwise the shared one. Every reader
 * and writer of a bill PDF has to agree on this, so it is resolved once here.
 */
export const BILL_PDF_BUCKET_NAME = resolveBillPdfBucket(
  environmentVariables.MINIO_BILL_PDF_BUCKET_NAME,
  environmentVariables.MINIO_BUCKET_NAME,
);
