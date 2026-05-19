import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { TextFieldSingleValidation } from 'payload';

export const instagramLinkValidation: TextFieldSingleValidation = (value, options) => {
  const localeString = options.req.i18n.language;
  if (value === undefined || value === null || value === '') {
    return getValidationMessage(localeString, {
      en: 'Link is required.',
      de: 'Link ist erforderlich.',
      fr: 'Le lien est requis.',
    });
  }

  // check against regex
  const instagramRegex =
    /^(https?:\/\/)?(www\.)?(instagram\.com\/?([a-zA-Z0-9_-]*)\/(p|reel)\/|instagr\.am\/p\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  if (!instagramRegex.test(value)) {
    return getValidationMessage(localeString, {
      en: 'Please enter a valid Instagram URL.',
      de: 'Bitte geben Sie eine gültige Instagram-URL ein.',
      fr: 'Veuillez entrer une URL Instagram valide.',
    });
  }

  return true; // Validation passed
};
