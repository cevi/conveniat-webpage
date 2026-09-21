import { extractMessageImages } from '@/features/chat/components/chat-view/message/utils/extract-message-images';

describe('extractMessageImages', () => {
  it('returns the images of the active locale', () => {
    const payload = {
      de: { text: 'Hallo', images: [{ url: '/api/images/file/a.webp', alt: 'Ein Bild' }] },
      en: { text: 'Hello', images: [{ url: '/api/images/file/a.webp', alt: 'An image' }] },
    };

    expect(extractMessageImages(payload, 'en')).toEqual([
      { url: '/api/images/file/a.webp', alt: 'An image', caption: undefined },
    ]);
  });

  it('falls back to another locale when the active one carries no images', () => {
    const payload = {
      de: { text: 'Hallo', images: [{ url: '/api/images/file/a.webp', alt: 'Ein Bild' }] },
      fr: { text: 'Salut' },
    };

    expect(extractMessageImages(payload, 'fr')).toEqual([
      { url: '/api/images/file/a.webp', alt: 'Ein Bild', caption: undefined },
    ]);
  });

  it('keeps the caption when the image has one', () => {
    const payload = {
      de: { images: [{ url: '/a.webp', alt: 'Bild', caption: 'Foto: Cevi' }] },
    };

    expect(extractMessageImages(payload, 'de')).toEqual([
      { url: '/a.webp', alt: 'Bild', caption: 'Foto: Cevi' },
    ]);
  });

  it('reads images that sit directly on the payload', () => {
    expect(extractMessageImages({ text: 'Hallo', images: [{ url: '/a.webp' }] }, 'de')).toEqual([
      { url: '/a.webp', alt: undefined, caption: undefined },
    ]);
  });

  it('skips entries without a usable url', () => {
    const payload = { de: { images: [{ alt: 'kein Bild' }, { url: '' }, { url: '/b.webp' }] } };

    expect(extractMessageImages(payload, 'de')).toEqual([
      { url: '/b.webp', alt: undefined, caption: undefined },
    ]);
  });

  it('returns nothing for payloads without images', () => {
    // Every message stored before the feature existed, plus every regular chat message.
    expect(extractMessageImages({ de: { text: 'Hallo' } }, 'de')).toEqual([]);
    expect(extractMessageImages({ text: 'Hallo' }, 'de')).toEqual([]);
    expect(extractMessageImages('Hallo', 'de')).toEqual([]);
    // eslint-disable-next-line unicorn/no-null
    expect(extractMessageImages(null, 'de')).toEqual([]);
    expect(extractMessageImages(undefined, 'de')).toEqual([]);
    expect(extractMessageImages({ de: { images: 'nope' } }, 'de')).toEqual([]);
  });
});
