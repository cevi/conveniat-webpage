import type { ChatImageUploadInput } from '@/lib/chat-images';
import { CHAT_IMAGE_EXTENSIONS, chatImageKeyPrefix } from '@/lib/chat-images';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const EXPIRES_IN_SECONDS = 3600;

/**
 * Signs a PUT for a new image in the chat. The URL is only valid for exactly the declared
 * content type and size: both headers are part of the signature, so the storage answers any
 * other body with SignatureDoesNotMatch. The presigner leaves `content-type` out of the
 * signature by default, which would let the uploader store the object as `text/html`.
 *
 * @param input - the chat, and the type and byte size of the file the browser will PUT
 * @returns the signed URL and the key the image will be stored under
 */
export const createChatImageUploadUrl = async ({
  chatId,
  contentType,
  contentLength,
}: ChatImageUploadInput): Promise<{ url: string; key: string }> => {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const key = `${chatImageKeyPrefix(chatId)}${uniqueName}.${CHAT_IMAGE_EXTENSIONS[contentType]}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const url = await getSignedUrl(s3ClientPublic, command, {
    expiresIn: EXPIRES_IN_SECONDS,
    signableHeaders: new Set(['content-type']),
  });

  return { url, key };
};
