import { describeQuotedMessage, quotedSnippetOf } from '@/features/chat/utils/quoted-snippet';

const IMAGE = { url: 'chat-images/00000000-0000-4000-8000-000000000001/1719830400000-k3j9x2.jpg' };

describe('quotedSnippetOf', () => {
  it('stores the text of a quoted text message', () => {
    expect(quotedSnippetOf({ text: 'Wer kommt mit?' })).toBe('Wer kommt mit?');
  });

  it('cuts a long text to 100 characters', () => {
    expect(quotedSnippetOf({ text: 'a'.repeat(150) })).toBe(`${'a'.repeat(100)}...`);
  });

  it('stores nothing for an image, rather than its storage path', () => {
    expect(quotedSnippetOf(IMAGE)).toBeUndefined();
  });

  it('stores nothing for a location', () => {
    expect(quotedSnippetOf({ location: { latitude: 47.35, longitude: 8.72 } })).toBeUndefined();
  });
});

describe('describeQuotedMessage', () => {
  it('names an image the way the chat list does, in the reader’s locale', () => {
    expect(describeQuotedMessage(IMAGE, 'de')).toEqual({ text: 'Bild', icon: 'image' });
    expect(describeQuotedMessage(IMAGE, 'fr')).toEqual({ text: 'Image', icon: 'image' });
    expect(describeQuotedMessage(IMAGE, 'en')).toEqual({ text: 'Image', icon: 'image' });
  });

  it('names a location behind its icon', () => {
    expect(describeQuotedMessage({ location: { latitude: 47.35, longitude: 8.72 } }, 'de')).toEqual(
      { text: 'Standort', icon: 'location' },
    );
  });

  it('quotes a text without its markdown and without an icon', () => {
    expect(describeQuotedMessage({ text: 'Treffpunkt *Züri 11*' }, 'de')).toEqual({
      text: 'Treffpunkt Züri 11',
      icon: undefined,
    });
  });
});
