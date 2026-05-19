import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { RelationshipFieldManyValidation, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

const titleMinWordCount = 3;
const titleMaxLength = 120;

/**
 * Custom validation for the blog article title field.
 *
 * @param value
 * @param arguments_
 *
 */
export const blogArticleTitleValidation: TextFieldSingleValidation = (value, arguments_) => {
  const localeString = arguments_.req.i18n.language;

  if (value === undefined || value === null || value === '') {
    return getValidationMessage(localeString, {
      en: 'Title is required',
      de: 'Titel ist erforderlich',
      fr: 'Le titre est requis',
    });
  }

  if (value.split(' ').length < titleMinWordCount)
    return getValidationMessage(localeString, {
      en: `Title must be at least ${titleMinWordCount} words`,
      de: `Titel muss aus mindestens ${titleMinWordCount} Wörtern bestehen`,
      fr: `Le titre doit comporter au moins ${titleMinWordCount} mots`,
    });

  if (value.length > titleMaxLength)
    return getValidationMessage(localeString, {
      en: `Title cannot be longer than ${titleMaxLength} characters`,
      de: `Titel darf nicht länger als ${titleMaxLength} Zeichen sein`,
      fr: `Le titre ne peut pas dépasser ${titleMaxLength} caractères`,
    });

  // use default text validation
  return text(value, arguments_);
};

export const photoCarouselMinSelectionValidation: RelationshipFieldManyValidation = (
  value,
  options,
) => {
  if (value === undefined || value === null || value.length < 5)
    return getValidationMessage(options.req.i18n.language, {
      en: 'At least 5 images are required',
      de: 'Es sind mindestens 5 Bilder erforderlich',
      fr: 'Au moins 5 images sont requises',
    });

  return true;
};
