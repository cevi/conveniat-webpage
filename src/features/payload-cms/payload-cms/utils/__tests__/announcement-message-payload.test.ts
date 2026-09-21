import { buildAnnouncementMessagePayload } from '@/features/payload-cms/payload-cms/utils/announcement-message-payload';
import type { Payload } from 'payload';

const image = (id: string, url: string): Record<string, unknown> => ({
  id,
  alt_de: `Alt ${id} de`,
  alt_en: `Alt ${id} en`,
  alt_fr: `Alt ${id} fr`,
  imageCaption_de: `Bildlegende ${id}`,
  sizes: { large: { url } },
});

const richText = (value: string): Record<string, unknown> => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text: value }] }],
  },
});

const payloadWithImages = (imageDocuments: Record<string, unknown>[]): Payload =>
  ({
    find: jest.fn().mockResolvedValue({ docs: imageDocuments }),
  }) as unknown as Payload;

describe('buildAnnouncementMessagePayload', () => {
  it('renders title and body per locale', async () => {
    const result = await buildAnnouncementMessagePayload({
      payload: payloadWithImages([]),
      documentAll: {
        title: { de: 'Titel', en: 'Title' },
        content: { de: richText('Inhalt'), en: richText('Content') },
      },
    });

    expect(result['de']).toEqual({ text: '*Titel*\n\nInhalt', title: 'Titel', body: 'Inhalt' });
    expect(result['en']).toEqual({ text: '*Title*\n\nContent', title: 'Title', body: 'Content' });
    expect(result['fr']).toBeUndefined();
  });

  it('prefers the incoming values of the locale currently being saved', async () => {
    const result = await buildAnnouncementMessagePayload({
      payload: payloadWithImages([]),
      documentAll: {
        title: { de: 'Alter Titel' },
        content: { de: richText('Alter Inhalt') },
      },
      override: { locale: 'de', title: 'Neuer Titel', content: richText('Neuer Inhalt') },
    });

    expect(result['de']?.text).toBe('*Neuer Titel*\n\nNeuer Inhalt');
  });

  it('attaches the images to every locale, with localized alt text and caption', async () => {
    const result = await buildAnnouncementMessagePayload({
      payload: payloadWithImages([image('a', '/api/images/file/a.webp')]),
      documentAll: {
        title: { de: 'Titel', en: 'Title' },
        content: { de: richText('Inhalt'), en: richText('Content') },
      },
      imageReferences: ['a'],
    });

    expect(result['de']?.images).toEqual([
      { url: '/api/images/file/a.webp', alt: 'Alt a de', caption: 'Bildlegende a' },
    ]);
    // Only the German caption is maintained on the image, so the English one has none.
    expect(result['en']?.images).toEqual([{ url: '/api/images/file/a.webp', alt: 'Alt a en' }]);
  });

  it('keeps the order the editor picked, which `find` does not preserve', async () => {
    const result = await buildAnnouncementMessagePayload({
      payload: payloadWithImages([image('b', '/b.webp'), image('a', '/a.webp')]),
      documentAll: { title: { de: 'Titel' }, content: { de: richText('Inhalt') } },
      imageReferences: ['a', 'b'],
    });

    expect(result['de']?.images?.map((entry) => entry.url)).toEqual(['/a.webp', '/b.webp']);
  });

  it('accepts populated image documents as well as ids', async () => {
    const result = await buildAnnouncementMessagePayload({
      payload: payloadWithImages([image('a', '/a.webp')]),
      documentAll: {
        title: { de: 'Titel' },
        content: { de: richText('Inhalt') },
        images: [image('a', '/a.webp')],
      },
    });

    expect(result['de']?.images).toHaveLength(1);
  });

  it('omits the images key when nothing is attached', async () => {
    const find = jest.fn();
    const result = await buildAnnouncementMessagePayload({
      payload: { find } as unknown as Payload,
      documentAll: { title: { de: 'Titel' }, content: { de: richText('Inhalt') } },
    });

    expect(result['de']).not.toHaveProperty('images');
    expect(find).not.toHaveBeenCalled();
  });
});
