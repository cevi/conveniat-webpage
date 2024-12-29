import { Locale } from '@/middleware';

// TODO: this should be fully dynamic with
//  regards to the defined locales
export const localizedDefaultValue =
  <T>(mapping: { de: T; en: T; fr: T }) =>
  ({ locale }: { locale: Locale }): T => {
    if (locale === 'de') {
      return mapping['de'];
    } else if (locale === 'fr') {
      return mapping['fr'];
    }
    return mapping['en'];
  };
