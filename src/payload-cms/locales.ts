import { Locale } from 'payload';

const DE = 'de' as const;
const FR = 'fr' as const;
const EN = 'en' as const;
export const LOCALE = { DE, FR, EN };

export const locales: Locale[] = [
  {
    label: {
      en: 'English',
      de: 'Englisch',
      fr: 'Anglais',
    },
    code: LOCALE.EN,
  },
  {
    label: {
      en: 'German',
      de: 'Deutsch',
      fr: 'Allemand',
    },
    code: LOCALE.DE,
  },
  {
    label: {
      en: 'French',
      de: 'Französisch',
      fr: 'Français',
    },
    code: LOCALE.FR,
  },
];
