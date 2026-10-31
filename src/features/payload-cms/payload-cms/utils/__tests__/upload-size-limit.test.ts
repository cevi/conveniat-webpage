import { localeFromAcceptLanguage } from '@/features/payload-cms/payload-cms/utils/upload-size-limit';

describe('localeFromAcceptLanguage', () => {
  it.each([
    ['fr', 'fr'],
    ['en-US,en;q=0.9', 'en'],
    ['de-CH', 'de'],
    ['it', 'de'],
    // what Headers.get answers when the header is missing
    [new Headers().get('accept-language'), 'de'],
  ])('answers %p in %s', (header, locale) => {
    expect(localeFromAcceptLanguage(header)).toBe(locale);
  });
});
