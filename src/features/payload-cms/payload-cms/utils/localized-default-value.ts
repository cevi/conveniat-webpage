import type { Locale } from '@/types/types';
import { LOCALE as COUNTRY_CODES } from '@/features/payload-cms/payload-cms/locales';

// TODO: this should be fully dynamic with
//  regards to the defined locales
export const localizedDefaultValue =
  <T>(mapping: { de: T; en: T; fr: T }) =>
  ({ locale }: { locale: Locale }): T => {
    if (locale === COUNTRY_CODES.DE) {
      return mapping[COUNTRY_CODES.DE];
    } else if (locale === COUNTRY_CODES.FR) {
      return mapping[COUNTRY_CODES.FR];
    }
    return mapping[COUNTRY_CODES.EN];
  };
