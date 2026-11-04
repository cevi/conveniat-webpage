import { extractEmailAddress } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import { EMAIL_SENDER_DOMAIN } from '@/features/payload-cms/payload-cms/utils/email-sender';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { TextFieldSingleValidation } from 'payload';

/**
 * Checks the sender of a form's email: mails are signed for one domain only, and a sender from
 * another lands in spam or is rejected. Empty is fine, the mail then goes out from the default
 * sender.
 *
 * Payload skips validation for drafts, so autosave keeps saving and only publishing is refused.
 * This used to be a warning rendered under the field. Payload renders such a component again
 * for every form-state answer and streams it after the state; merged before it arrived, it
 * suspended the edit view, which hid the whole admin panel and threw the editor's caret to the
 * start of the email they were writing.
 */
export const validateEmailFrom =
  (domain: string = EMAIL_SENDER_DOMAIN): TextFieldSingleValidation =>
  (value, { req }) => {
    if (typeof value !== 'string' || value.trim() === '') return true;

    const address = extractEmailAddress(value);
    if (address === '') {
      return getValidationMessage(req.i18n.language, {
        en: 'Malformed sender. With angle brackets, close them: "Name" <name@example.ch>',
        de: 'Ungültiger Absender. Mit spitzen Klammern so: "Name" <name@example.ch>',
        fr: 'Expéditeur invalide. Avec des chevrons : "Nom" <nom@example.ch>',
      });
    }
    if (address.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) return true;

    return getValidationMessage(req.i18n.language, {
      en: `The sender must end in @${domain}, otherwise the mails land in spam.`,
      de: `Der Absender muss auf @${domain} enden, sonst landen die Mails im Spam.`,
      fr: `L’expéditeur doit se terminer par @${domain}, sinon les e-mails finissent en spam.`,
    });
  };
