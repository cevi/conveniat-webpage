import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
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
