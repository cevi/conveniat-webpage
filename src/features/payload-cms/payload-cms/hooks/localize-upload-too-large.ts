import {
  fileTooLargeMessage,
  localeFromAcceptLanguage,
} from '@/features/payload-cms/payload-cms/utils/upload-size-limit';
import type { AfterErrorHook } from 'payload';

const PAYLOAD_TOO_LARGE = 413;

/**
 * Payload answers an upload above its limits with a fixed English sentence. 413 is the status
 * only its multipart parser uses, so this replaces the message for every such answer with one in
 * the language the admin panel sends as `Accept-Language`.
 *
 * Payload's `upload.limitHandler` would be the obvious place, but Payload hands `config.upload`
 * to the admin panel's client config, and a function there crashes every admin page.
 *
 * @param args - the error and the request it answers
 * @returns the localized response, or nothing for every other error
 */
export const localizeUploadTooLarge: AfterErrorHook = ({ error, req }) => {
  if (!('status' in error) || error.status !== PAYLOAD_TOO_LARGE) return;
  const locale = localeFromAcceptLanguage(req.headers.get('accept-language'));
  return {
    response: { errors: [{ message: fileTooLargeMessage[locale] }] },
    status: PAYLOAD_TOO_LARGE,
  };
};
