import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { TextFieldSingleValidation } from 'payload';

export const youtubeLinkValidation: TextFieldSingleValidation = (value, options) => {
  const localeString = options.req.i18n.language;
  if (value === undefined || value === null || value === '') {
    return getValidationMessage(localeString, {
      en: 'Link is required.',
      de: 'Link ist erforderlich.',
      fr: 'Le lien est requis.',
    });
  }

  // check against regex
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  const youtubeShortsRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  if (!youtubeRegex.test(value) && !youtubeShortsRegex.test(value)) {
    return getValidationMessage(localeString, {
      en: 'Please enter a valid YouTube URL.',
      de: 'Bitte geben Sie eine gültige YouTube-URL ein.',
      fr: 'Veuillez entrer une URL YouTube valide.',
    });
  }

  return true; // Validation passed
};
