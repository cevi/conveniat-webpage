import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface PresignedUploadInput {
  key: string;
  /** the MIME type the browser will send, checked against an allow list by the caller */
  contentType: string;
  /** the byte size the browser will send, checked against a maximum by the caller */
  contentLength: number;
  expiresInSeconds: number;
}

/**
 * Signs a PUT into the shared bucket. The URL is only valid for exactly the declared content
 * type and size: both headers are part of the signature, so the storage answers any other
 * body with SignatureDoesNotMatch. The presigner leaves `content-type` out of the signature
 * by default, which would let the uploader store the object as `text/html`, and a URL without
 * a length accepts a body of any size.
 *
 * @param input - the key, and the type and byte size of the file the browser will PUT
 * @returns the signed URL
 */
export const createPresignedUploadUrl = async ({
  key,
  contentType,
  contentLength,
  expiresInSeconds,
}: PresignedUploadInput): Promise<string> =>
  getSignedUrl(
    s3ClientPublic,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: expiresInSeconds, signableHeaders: new Set(['content-type']) },
  );
