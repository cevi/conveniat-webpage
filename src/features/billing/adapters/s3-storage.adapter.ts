import { environmentVariables } from '@/config/environment-variables';
import type { StoragePort } from '@/features/billing/ports/storage.port';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class S3StorageAdapter implements StoragePort {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3 = new S3Client({
      endpoint: environmentVariables.MINIO_HOST,
      region: 'us-east-1',
      credentials: {
        accessKeyId: environmentVariables.MINIO_ACCESS_KEY_ID,
        secretAccessKey: environmentVariables.MINIO_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    this.bucket = environmentVariables.MINIO_BUCKET_NAME;
  }

  async fetchPdf(filename: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    });
    const response = await this.s3.send(command);
    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }
}
