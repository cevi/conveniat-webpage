import { z } from 'zod';

/**
 * Image types a chat bubble renders with a plain `<img>`, each stored under its own extension.
 * SVG is left out on purpose: it can carry script and would be served from the bucket as is.
 */
export const CHAT_IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
} as const;

export type ChatImageContentType = keyof typeof CHAT_IMAGE_EXTENSIONS;

const CHAT_IMAGE_CONTENT_TYPES = Object.keys(CHAT_IMAGE_EXTENSIONS) as [
  ChatImageContentType,
  ...ChatImageContentType[],
];

/** Photos are uploaded as picked, without resizing, so this has to fit a full-size phone photo. */
export const CHAT_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Whether a picked file's type can be uploaded into a chat.
 *
 * @param type - the MIME type the browser reports for the file
 * @returns true for the raster types listed in `CHAT_IMAGE_EXTENSIONS`
 */
export const isChatImageContentType = (type: string): type is ChatImageContentType =>
  Object.hasOwn(CHAT_IMAGE_EXTENSIONS, type);

/** Input of the procedures that hand out an upload URL for a chat image. */
export const chatImageUploadInputSchema = z.object({
  chatId: z.string().uuid(),
  contentType: z.enum(CHAT_IMAGE_CONTENT_TYPES),
  contentLength: z.number().int().positive().max(CHAT_IMAGE_MAX_BYTES),
});

export type ChatImageUploadInput = z.infer<typeof chatImageUploadInputSchema>;

/**
 * The key prefix every image of a chat is stored under. Downloads are limited to it, so a
 * signed link for one chat never reaches anything else in the shared bucket.
 *
 * @param chatId - the chat the image was sent in
 * @returns `chat-images/<chatId>/`
 */
export const chatImageKeyPrefix = (chatId: string): string => `chat-images/${chatId}/`;
