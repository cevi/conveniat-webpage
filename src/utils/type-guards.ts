import type { StaticTranslationString } from '@/types/types';

export const isStaticTranslationString = (
  text: unknown,
): text is Partial<StaticTranslationString> => {
  return (
    typeof text === 'object' &&
    text !== null &&
    !Array.isArray(text) &&
    ('en' in text || 'de' in text || 'fr' in text)
  );
};
