import type { ChatImageUploadInput } from '@/lib/chat-images';
import { CHAT_IMAGE_UPLOAD, chatImageKeyPrefix } from '@/lib/chat-images';
import { createPresignedUploadUrl } from '@/lib/presigned-urls';

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
}: ChatImageUploadInput): Promise<{ url: string; key: string }> =>
  createPresignedUploadUrl(CHAT_IMAGE_UPLOAD, {
    keyPrefix: chatImageKeyPrefix(chatId),
    contentType,
    contentLength,
  });
