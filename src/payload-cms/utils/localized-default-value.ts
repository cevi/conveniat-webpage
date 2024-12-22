export const localizedDefaultValue =
  <T>(mapping: { de: T; en: T; fr: T }) =>
  ({ locale }: { locale: 'de' | 'fr' | 'en' }): T => {
    if (locale === 'de') {
      return mapping['de'];
    } else if (locale === 'fr') {
      return mapping['fr'];
    }
    return mapping['en'];
  };
