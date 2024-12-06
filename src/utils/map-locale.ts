export const mapLocale = (locale: 'de' | 'en' | 'fr'): 'de-CH' | 'fr-CH' | 'en-GB' => {
  switch (locale) {
    case 'de': {
      return 'de-CH';
    }
    case 'en': {
      return 'en-GB';
    }
    case 'fr': {
      return 'fr-CH';
    }
  }
};
