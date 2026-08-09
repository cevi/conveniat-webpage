import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import { phoneNumberToTelHref } from '@/features/payload-cms/utils/phone-number';
import type { TextFieldSingleValidation } from 'payload';

/**
 * Validates the phone number of a rich text link with `linkType: 'phone'`.
 * Other link types are ignored, as they don't store a phone number.
 */
export const phoneNumberValidation: TextFieldSingleValidation = (value, options) => {
  const { linkType } = options.siblingData as { linkType?: string };
  if (linkType !== 'phone') return true;

  const localeString = options.req.i18n.language;

  if (value === undefined || value === null || value.trim() === '') {
    return getValidationMessage(localeString, {
      en: 'Phone number is required.',
      de: 'Telefonnummer ist erforderlich.',
      fr: 'Le numéro de téléphone est requis.',
    });
  }

  if (phoneNumberToTelHref(value) === '') {
    return getValidationMessage(localeString, {
      en: 'Please enter a valid phone number, e.g. +41 79 316 83 49.',
      de: 'Bitte eine gültige Telefonnummer eingeben, z. B. +41 79 316 83 49.',
      fr: 'Veuillez saisir un numéro de téléphone valide, par ex. +41 79 316 83 49.',
    });
  }

  return true;
};
