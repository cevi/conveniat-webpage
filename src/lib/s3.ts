import { environmentVariables } from '@/config/environment-variables';
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
