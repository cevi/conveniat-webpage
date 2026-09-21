import type { Locale, StaticTranslationString } from '@/types/types';

const localizedSpotLeft: StaticTranslationString = {
  de: 'Platz frei',
  en: 'spot left',
  fr: 'place restante',
};

const localizedSpotsLeft: StaticTranslationString = {
  de: 'Plätze frei',
  en: 'spots left',
  fr: 'places restantes',
};

/**
 * Localized "spots left" label matching the grammatical number of `spotsLeft`,
 * so that a single remaining spot reads "1 Platz frei" instead of "1 Plätze frei".
 */
export const getSpotsLeftText = (spotsLeft: number, locale: Locale): string =>
  spotsLeft === 1 ? localizedSpotLeft[locale] : localizedSpotsLeft[locale];
