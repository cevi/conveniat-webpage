import type { EmergencyCard } from '@/features/payload-cms/payload-types';

export interface EmergencyCardDocument {
  id: string;
  title: string | undefined;
  filename: string | undefined;
  url: string | undefined;
}

export interface EmergencyCardImage {
  id: string;
  url: string | undefined;
  filename: string | undefined;
  alt_de: string;
  alt_en: string;
  alt_fr: string;
  imageCaption_de: string | undefined;
  imageCaption_en: string | undefined;
  imageCaption_fr: string | undefined;
}

/** An emergency card as the app receives it: what the card renders, and nothing else. */
export interface EmergencyCardDto extends Pick<
  EmergencyCard,
  'id' | 'title' | 'description' | 'procedure'
> {
  isExpandedByDefault: boolean;
  isNonMinifiable: boolean;
  documents: EmergencyCardDocument[];
  images: EmergencyCardImage[];
}

const isPopulated = <T extends object>(value: string | T | null | undefined): value is T =>
  typeof value === 'object' && value !== null;

/**
 * Maps an emergency card from the local API to the fields the emergency page renders.
 *
 * The procedure is public, and the raw card would hand every visitor the internal document
 * description, the document permissions and the last editor. A relationship that is not
 * populated, because it was deleted or the caller may not read it, is left out.
 *
 * @param card - the card as read with its documents and images populated
 */
export const toEmergencyCardDto = (card: EmergencyCard): EmergencyCardDto => ({
  id: card.id,
  title: card.title,
  description: card.description,
  procedure: card.procedure,
  isExpandedByDefault: card.isExpandedByDefault === true,
  isNonMinifiable: card.isNonMinifiable === true,
  documents: (card.documents ?? [])
    .filter((document_) => isPopulated(document_))
    .map((document_) => ({
      id: document_.id,
      title: document_.title ?? undefined,
      filename: document_.filename ?? undefined,
      url: document_.url ?? undefined,
    })),
  images: (card.images ?? [])
    .filter((image) => isPopulated(image))
    .map((image) => ({
      id: image.id,
      url: image.url ?? undefined,
      filename: image.filename ?? undefined,
      alt_de: image.alt_de,
      alt_en: image.alt_en,
      alt_fr: image.alt_fr,
      imageCaption_de: image.imageCaption_de ?? undefined,
      imageCaption_en: image.imageCaption_en ?? undefined,
      imageCaption_fr: image.imageCaption_fr ?? undefined,
    })),
});
