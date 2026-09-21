import { environmentVariables } from '@/config/environment-variables';
import { resolveBillPdfBucket } from '@/lib/storage-buckets';
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: environmentVariables.S3_ACCESS_KEY_ID,
    secretAccessKey: environmentVariables.S3_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
  endpoint: environmentVariables.S3_HOST,
});

/**
 * S3 Client for generating pre-signed URLs that are accessible from the browser.
 * Uses S3_PUBLIC_HOST instead of internal S3_HOST.
 *
 * Presigning a PutObject has no body, so with the SDK's default checksum mode the URL carries
 * the CRC32 of an empty body. AWS S3 and SeaweedFS check it against what the browser sends and
 * reject the upload with BadDigest; only MinIO ignored it. Checksums are only added when the
 * operation requires them, which presigned uploads do not.
 */
export const s3ClientPublic = new S3Client({
  credentials: {
    accessKeyId: environmentVariables.S3_ACCESS_KEY_ID,
    secretAccessKey: environmentVariables.S3_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
  endpoint: environmentVariables.S3_PUBLIC_HOST,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export const S3_BUCKET_NAME = environmentVariables.S3_BUCKET_NAME;

/**
 * Bucket for bill PDFs — its own when configured, otherwise the shared one. Every reader
 * and writer of a bill PDF has to agree on this, so it is resolved once here.
 */
export const BILL_PDF_BUCKET_NAME = resolveBillPdfBucket(
  environmentVariables.S3_BILL_PDF_BUCKET_NAME,
  environmentVariables.S3_BUCKET_NAME,
);
