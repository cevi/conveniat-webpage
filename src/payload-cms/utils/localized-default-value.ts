export const localizedDefaultValue =
  <T>(mapping: { de: T; en: T; fr: T }) =>
  ({ locale }: { locale: 'de-CH' | 'fr-CH' | 'en-GB' }): T => {
    if (locale === 'de-CH') {
      return mapping['de'];
    } else if (locale === 'fr-CH') {
      return mapping['fr'];
    }
    return mapping['en'];
  };
