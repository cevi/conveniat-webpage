import {
  getImageAltInLocale,
  getImageCaptionInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import { getLexicalText } from '@/features/payload-cms/payload-cms/utils/lexical-to-markdown';
import type { Image } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { Payload } from 'payload';

/**
 * The locales an announcement is translated into. Kept local to this module because the
 * announcement payload is written into PostgreSQL as a plain JSON blob and therefore has
 * to stay stable independently of the Payload localization config.
 */
export const ANNOUNCEMENT_LOCALES: Locale[] = ['de', 'en', 'fr'];

/**
 * An image attached to an announcement, as stored inside the chat message payload.
 *
 * The URL is relative to the app host so that the same blob keeps working when the host
 * changes (e.g. between the dev and the production deployment).
 */
export interface AnnouncementImagePayload {
  url: string;
  alt: string;
  caption?: string;
}

/** The chat message payload of a single announcement locale. */
export interface AnnouncementLocalePayload {
  text: string;
  title: string;
  body: string;
  images?: AnnouncementImagePayload[];
}

/** The chat message payload of an announcement, one entry per translated locale. */
export type AnnouncementMessagePayload = Record<string, AnnouncementLocalePayload>;

/**
 * Normalizes whatever Payload hands us for an upload relationship - ids, populated docs
 * or a mix of both - into a list of image ids, preserving the order chosen by the editor.
 *
 * @param imageReferences the raw value of the `images` field
 */
const toImageIds = (imageReferences: unknown): string[] => {
  if (!Array.isArray(imageReferences)) return [];

  return imageReferences
    .map((reference) => {
      if (typeof reference === 'string') return reference;
      if (typeof reference === 'object' && reference !== null) {
        const id = (reference as Record<string, unknown>)['id'];
        if (typeof id === 'string') return id;
      }
      return '';
    })
    .filter((id) => id !== '');
};

/**
 * Loads the attached images and renders them, once per locale, into the shape that is
 * stored in the chat message payload.
 *
 * The `images` field itself is not localized - the same image is sent to every locale -
 * but its alt text and caption are maintained per language on the image document.
 *
 * @param payload the Payload instance used to resolve the image documents
 * @param imageReferences the raw value of the announcement's `images` field
 */
export const loadAnnouncementImages = async (
  payload: Payload,
  imageReferences: unknown,
): Promise<Record<string, AnnouncementImagePayload[]>> => {
  const imageIds = toImageIds(imageReferences);
  if (imageIds.length === 0) return {};

  const { docs } = await payload.find({
    collection: 'images',
    where: { id: { in: imageIds } },
    pagination: false,
    depth: 0,
  });

  // `find` does not preserve the order of the `in` filter, but the editor's order is
  // the order the images are shown in, so restore it here.
  const imagesById = new Map(docs.map((document_) => [document_.id, document_]));
  const orderedImages = imageIds
    .map((id) => imagesById.get(id))
    .filter((image): image is Image => image !== undefined);

  const imagesPerLocale: Record<string, AnnouncementImagePayload[]> = {};
  for (const locale of ANNOUNCEMENT_LOCALES) {
    const localizedImages = orderedImages
      .map((image) => {
        // The `large` size is a pre-optimized webp; the original is only a fallback for
        // images that were uploaded before the size existed.
        const url = getRelativeImageUrl(image.sizes?.large?.url ?? image.url);
        const caption = getImageCaptionInLocale(locale, image);
        return {
          url,
          alt: getImageAltInLocale(locale, image),
          ...(caption === undefined || caption === null || caption === ''
            ? {}
            : { caption: caption }),
        };
      })
      .filter((image) => image.url !== '');

    if (localizedImages.length > 0) {
      imagesPerLocale[locale] = localizedImages;
    }
  }

  return imagesPerLocale;
};

/**
 * The per-language fields of an announcement. `title` and `content` are groups with one
 * sub-field per locale, so they are keyed by locale just like a localized field would be.
 */
export interface AnnouncementTranslations {
  title?: Partial<Record<string, string | null>> | null | undefined;
  content?: Partial<Record<string, unknown>> | null | undefined;
}

interface BuildAnnouncementPayloadArguments {
  payload: Payload;
  announcement: AnnouncementTranslations;
  /** The raw value of the announcement's `images` field. */
  imageReferences?: unknown;
}

/**
 * Builds the localized chat message payload of an announcement.
 *
 * The result is stored verbatim as the message content in PostgreSQL and is what the chat
 * renders, so every locale carries the plain-text rendition of the rich text as well as
 * the attached images. A language the editor left empty is left out, and the chat falls
 * back to another one.
 */
export const buildAnnouncementMessagePayload = async ({
  payload,
  announcement,
  imageReferences,
}: BuildAnnouncementPayloadArguments): Promise<AnnouncementMessagePayload> => {
  const images = await loadAnnouncementImages(payload, imageReferences);

  const localizedPayload: AnnouncementMessagePayload = {};
  for (const locale of ANNOUNCEMENT_LOCALES) {
    const title = announcement.title?.[locale] ?? '';
    const formattedContent = getLexicalText(announcement.content?.[locale]);

    if (title === '' && formattedContent === '') continue;

    const localeImages = images[locale];
    localizedPayload[locale] = {
      text: `*${title}*\n\n${formattedContent}`,
      title: title,
      body: formattedContent,
      ...(localeImages === undefined ? {} : { images: localeImages }),
    };
  }

  return localizedPayload;
};
