import { environmentVariables } from '@/config/environment-variables';
import { s3Storage } from '@payloadcms/storage-s3';

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
export const s3StorageConfiguration = s3Storage({
  collections: {
    images: true,
    documents: true,
    userSubmittedImages: true,
  },
  bucket: MINIO_BUCKET_NAME,
  config: {
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY_ID,
      secretAccessKey: MINIO_SECRET_ACCESS_KEY,
    },
    region: 'us-east-1',
    forcePathStyle: true,
    endpoint: MINIO_HOST,
  },
});
