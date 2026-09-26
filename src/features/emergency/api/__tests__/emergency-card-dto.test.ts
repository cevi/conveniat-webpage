import { toEmergencyCardDto } from '@/features/emergency/api/emergency-card-dto';
import type {
  Document,
  EmergencyCard,
  Image as ImageDocument,
} from '@/features/payload-cms/payload-types';

const procedure: EmergencyCard['procedure'] = {
  root: {
    type: 'root',
    children: [],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
};

const restrictedDocument = {
  id: 'document-1',
  title: 'Evacuation plan',
  internalDescription: 'Only for the security team',
  permissions: 'permission-1',
  filename: 'evacuation.pdf',
  url: '/api/documents/file/evacuation.pdf',
  lastEditedByUser: 'user-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Document;

const image = {
  id: 'image-1',
  alt_de: 'Sammelplatz',
  alt_en: 'Assembly point',
  alt_fr: 'Point de rassemblement',
  imageCaption_de: 'Beim Haupteingang',
  url: '/api/images/file/assembly.jpg',
  filename: 'assembly.jpg',
  lastEditedByUser: 'user-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as ImageDocument;

const card = {
  id: 'card-1',
  _localized_status: { published: true },
  _locale: 'de',
  title: 'Brand',
  description: 'Was bei einem Brand zu tun ist',
  procedure,
  documents: [restrictedDocument, 'document-without-access'],
  images: [image, 'deleted-image'],
  isExpandedByDefault: true,
  isNonMinifiable: false,
  lastEditedByUser: 'user-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as EmergencyCard;

describe('toEmergencyCardDto', () => {
  it('keeps what the card renders', () => {
    expect(toEmergencyCardDto(card)).toEqual({
      id: 'card-1',
      title: 'Brand',
      description: 'Was bei einem Brand zu tun ist',
      procedure,
      isExpandedByDefault: true,
      isNonMinifiable: false,
      documents: [
        {
          id: 'document-1',
          title: 'Evacuation plan',
          filename: 'evacuation.pdf',
          url: '/api/documents/file/evacuation.pdf',
        },
      ],
      images: [
        {
          id: 'image-1',
          url: '/api/images/file/assembly.jpg',
          filename: 'assembly.jpg',
          alt_de: 'Sammelplatz',
          alt_en: 'Assembly point',
          alt_fr: 'Point de rassemblement',
          imageCaption_de: 'Beim Haupteingang',
          imageCaption_en: undefined,
          imageCaption_fr: undefined,
        },
      ],
    });
  });

  it('never returns internal document fields or the last editor', () => {
    const serialised = JSON.stringify(toEmergencyCardDto(card));

    expect(serialised).not.toContain('internalDescription');
    expect(serialised).not.toContain('permission-1');
    expect(serialised).not.toContain('user-1');
  });

  it('leaves out documents and images the caller could not read', () => {
    const dto = toEmergencyCardDto(card);

    expect(dto.documents.map((document_) => document_.id)).toEqual(['document-1']);
    expect(dto.images.map((entry) => entry.id)).toEqual(['image-1']);
  });

  it('reads a card without documents or images', () => {
    // eslint-disable-next-line unicorn/no-null -- Payload returns null for a cleared relationship
    const dto = toEmergencyCardDto({ ...card, documents: null, images: null });

    expect(dto.documents).toEqual([]);
    expect(dto.images).toEqual([]);
  });
});
