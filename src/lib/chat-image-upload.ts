import type { ChatImageUploadInput } from '@/lib/chat-images';
import { CHAT_IMAGE_EXTENSIONS, chatImageKeyPrefix } from '@/lib/chat-images';
import { createPresignedUploadUrl } from '@/lib/presigned-upload';

const EXPIRES_IN_SECONDS = 3600;

/**
 * Signs a PUT for a new image in the chat, valid for exactly the declared content type and
 * size.
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

  const url = await createPresignedUploadUrl({
    key,
    contentType,
    contentLength,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  });

  return { url, key };
};
