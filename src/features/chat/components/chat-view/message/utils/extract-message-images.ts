import type { Locale } from '@/types/types';

/** An image attached to a message, as stored inside the message payload. */
export interface MessageImage {
  url: string;
  alt?: string | undefined;
  caption?: string | undefined;
}

const toMessageImages = (value: unknown): MessageImage[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): MessageImage | undefined => {
      if (typeof entry !== 'object' || entry === null) return undefined;
      const entryRecord = entry as Record<string, unknown>;
      const url = entryRecord['url'];
      if (typeof url !== 'string' || url === '') return undefined;
      return {
        url,
        alt: typeof entryRecord['alt'] === 'string' ? entryRecord['alt'] : undefined,
        caption: typeof entryRecord['caption'] === 'string' ? entryRecord['caption'] : undefined,
      };
    })
    .filter((image): image is MessageImage => image !== undefined);
};

/**
 * Extracts the images attached to a message from its payload.
 *
 * Announcements are stored as one payload per locale (`{ de: { text, images }, … }`), so the
 * images of the active locale are used, falling back to English and then to whichever locale
 * is present - the images themselves are the same everywhere, only alt text and caption are
 * translated. Payloads without attached images - every regular chat message - yield an empty
 * list, which is also the answer for the payloads written before this field existed.
 *
 * @param payload the raw message payload
 * @param locale the locale the chat is currently rendered in
 */
export const extractMessageImages = (payload: unknown, locale: Locale): MessageImage[] => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return [];

  const payloadRecord = payload as Record<string, unknown>;

  const directImages = toMessageImages(payloadRecord['images']);
  if (directImages.length > 0) return directImages;

  const localizedCandidates = [
    payloadRecord[locale],
    payloadRecord['en'],
    payloadRecord['de'],
    payloadRecord['fr'],
  ];
  for (const candidate of localizedCandidates) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const images = toMessageImages((candidate as Record<string, unknown>)['images']);
    if (images.length > 0) return images;
  }

  return [];
};
