import {
  describeMessagePreview,
  getMessagePreviewText,
} from '@/features/chat/api/utils/get-message-preview-text';
import type { StaticTranslationString } from '@/types/types';

const previewOf = (payload: unknown): string | StaticTranslationString =>
  getMessagePreviewText({ contentVersions: [{ payload }] });

describe('getMessagePreviewText markdown stripping', () => {
  it('drops the emphasis markers of the chat dialect', () => {
    expect(previewOf({ text: '*this is bold*' })).toBe('this is bold');
    expect(previewOf({ text: '_kursiv_' })).toBe('kursiv');
    expect(previewOf({ text: '~gestrichen~' })).toBe('gestrichen');
  });

  it('shows only the label of a markdown link', () => {
    expect(previewOf({ text: '[Link](https://google.com)' })).toBe('Link');
    expect(previewOf({ text: 'Siehe [das Programm](https://conveniat27.ch/programm) dazu' })).toBe(
      'Siehe das Programm dazu',
    );
  });

  it('keeps a bare URL intact', () => {
    const url = 'https://conveniat27.ch/a_b_c';
    expect(previewOf({ text: `Mehr unter ${url}` })).toBe(`Mehr unter ${url}`);
  });

  it('leaves text without formatting untouched', () => {
    expect(previewOf({ text: '4 * 5 = 20' })).toBe('4 * 5 = 20');
    expect(previewOf({ text: 'Hoi zäme' })).toBe('Hoi zäme');
  });

  it('strips legacy string payloads that are not system messages', () => {
    expect(previewOf('*Znacht verschoben*')).toBe('Znacht verschoben');
  });

  it('strips the announcement title marker in every locale', () => {
    expect(
      previewOf({
        de: '*Znacht verschoben*',
        en: '*Dinner moved*',
        fr: '*Souper déplacé*',
      }),
    ).toEqual({
      de: 'Znacht verschoben',
      en: 'Dinner moved',
      fr: 'Souper déplacé',
    });
  });

  it('strips nested announcement bodies', () => {
    expect(
      previewOf({
        de: { text: 'Treffpunkt: [Zeltplatz](https://conveniat27.ch/karte)' },
        en: { text: 'Meeting point: [camp site](https://conveniat27.ch/karte)' },
        fr: { text: 'Rendez-vous: [le camp](https://conveniat27.ch/karte)' },
      }),
    ).toEqual({
      de: 'Treffpunkt: Zeltplatz',
      en: 'Meeting point: camp site',
      fr: 'Rendez-vous: le camp',
    });
  });

  it('strips alert responses and questions', () => {
    expect(previewOf({ message: '*Hilfe ist unterwegs*', phoneNumber: '+41 79 123 45 67' })).toBe(
      'Hilfe ist unterwegs',
    );
    expect(previewOf({ question: '*Brauchst du Hilfe?*', options: ['ja', 'nein'] })).toBe(
      'Brauchst du Hilfe?',
    );
  });
});

describe('getMessagePreviewText of a deleted message', () => {
  it('says the message was deleted instead of what it said', () => {
    expect(
      getMessagePreviewText({
        contentVersions: [{ payload: { text: 'Das Passwort ist 1234' } }],
        deletedAt: new Date(),
      }),
    ).toEqual({ de: 'Nachricht gelöscht', en: 'Message deleted', fr: 'Message supprimé' });
  });
});

const describe_ = (payload: unknown): ReturnType<typeof describeMessagePreview> =>
  describeMessagePreview({ contentVersions: [{ payload }] });

describe('describeMessagePreview of a message without text', () => {
  it('names an image in words and leaves the picture to the icon', () => {
    expect(describe_({ url: 'chat-images/chat-1/1719830400000-k3j9x2.jpg' })).toEqual({
      messagePreview: { de: 'Bild', en: 'Image', fr: 'Image' },
      messagePreviewIcon: 'image',
    });
  });

  it('names a shared location and an emergency alert the same way', () => {
    expect(describe_({ location: { latitude: 47.3, longitude: 8.5 } })).toMatchObject({
      messagePreview: { de: 'Standort' },
      messagePreviewIcon: 'location',
    });
    expect(describe_({ system_msg_type: 'emergency_alert' })).toMatchObject({
      messagePreview: { de: 'Notfallwarnung' },
      messagePreviewIcon: 'emergency',
    });
  });

  it('has no icon for text, nor for a deleted image', () => {
    expect(describe_({ text: 'Hoi zäme' })).toEqual({ messagePreview: 'Hoi zäme' });
    expect(
      describeMessagePreview({
        contentVersions: [{ payload: { url: 'chat-images/chat-1/a.jpg' } }],
        deletedAt: new Date(),
      }).messagePreviewIcon,
    ).toBeUndefined();
  });
});
