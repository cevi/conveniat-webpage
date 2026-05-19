export const getValidationMessage = (
  locale: string | undefined | null,
  messages: { en: string; de: string; fr: string },
): string => {
  if (locale === 'de') return messages.de;
  if (locale === 'fr') return messages.fr;
  return messages.en;
};
