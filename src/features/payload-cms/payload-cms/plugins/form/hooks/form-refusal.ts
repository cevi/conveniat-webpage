import { formErrorTexts } from '@/features/payload-cms/form-error-texts';
import type { Locale } from '@/types/types';
import { type ErrorParameters, formatErrorText } from '@/utils/user-error-message';
import { APIError } from 'payload';

const isLocale = (value: string | undefined): value is Locale =>
  value === 'de' || value === 'en' || value === 'fr';

/**
 * Refuses a submission with a reason the form translates, see `formErrorTexts`. The message is
 * the text in the request's language, which a browser on the previous release shows as it is.
 */
export const formRefusal = (
  request: { locale?: string | undefined },
  status: number,
  reason: keyof typeof formErrorTexts,
  params?: ErrorParameters,
): APIError => {
  const locale: Locale = isLocale(request.locale) ? request.locale : 'de';
  const message = formatErrorText(formErrorTexts[reason][locale], params);
  return new APIError(message, status, { reason, params }, true);
};
