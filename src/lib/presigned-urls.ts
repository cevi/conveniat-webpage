import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import type { UploadPolicy } from '@/lib/upload-policy';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

/** Long enough to start a large upload on camp wifi; the URL is used right after it is made. */
const UPLOAD_EXPIRES_IN_SECONDS = 600;

/** A download link sits in a rendered list or chat for a while before somebody opens it. */
const DOWNLOAD_EXPIRES_IN_SECONDS = 3600;

interface PresignedUploadInput<ContentType extends string> {
  /** Where the object goes, ending in a slash. The name below it is chosen here. */
  keyPrefix: string;
  /** the MIME type the browser will send */
  contentType: ContentType;
  /** the byte size the browser will send */
  contentLength: number;
}

/**
 * Signs a PUT into the shared bucket, and is the only place that does: ESLint keeps the
 * presigner out of every other file, so no upload can be signed around these rules.
 *
 * - The type and the size have to be allowed by the policy.
 * - The URL is only valid for exactly that type and size. Both headers are part of the
 *   signature, so the storage answers any other body with SignatureDoesNotMatch. The
 *   presigner leaves `content-type` out of the signature by default, which would let the
 *   uploader store the object as `text/html`, and a URL without a length accepts any size.
 * - The object name is random and chosen here, never by the browser.
 * - The URL expires after ten minutes.
 *
 * Who may upload, and what happens to the object afterwards, stays with the caller.
 *
 * @param policy - what this kind of upload may store
 * @param input - the prefix to store under, and the type and byte size the browser will PUT
 * @returns the signed URL and the key the object will be stored under
 */
export const createPresignedUploadUrl = async <ContentType extends string>(
  policy: UploadPolicy<ContentType>,
  { keyPrefix, contentType, contentLength }: PresignedUploadInput<ContentType>,
): Promise<{ url: string; key: string }> => {
  // the procedure's input schema has refused these already; this holds without one
  if (!Object.hasOwn(policy.extensions, contentType)) {
    throw new Error(`Upload refused, content type ${contentType} is not allowed`);
  }
  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > policy.maxBytes) {
    throw new Error(`Upload refused, ${String(contentLength)} bytes is not an allowed size`);
  }
  if (!keyPrefix.endsWith('/')) {
    throw new Error('Upload refused, the key prefix has to end in a slash');
  }

  const key = `${keyPrefix}${randomUUID()}.${policy.extensions[contentType]}`;
  const url = await getSignedUrl(
    s3ClientPublic,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: UPLOAD_EXPIRES_IN_SECONDS, signableHeaders: new Set(['content-type']) },
  );

  return { url, key };
};

/**
 * Signs a link the browser reads one object of the shared bucket through, valid for an hour.
 * The caller has checked that the key is one this user may read.
 *
 * @param key - the object to read
 * @returns the signed URL
 */
export const createPresignedDownloadUrl = async (key: string): Promise<string> =>
  getSignedUrl(s3ClientPublic, new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }), {
    expiresIn: DOWNLOAD_EXPIRES_IN_SECONDS,
  });
