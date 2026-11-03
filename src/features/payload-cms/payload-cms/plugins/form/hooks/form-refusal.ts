import { formErrorTexts } from '@/features/payload-cms/form-error-texts';
import { type ErrorParameters, formatErrorText } from '@/utils/user-error-message';
import { APIError } from 'payload';

/**
 * Refuses a submission with a reason the form translates, see `formErrorTexts`. The message is
 * the English text, for the logs and for a browser still running the release before this one.
 */
export const formRefusal = (
  status: number,
  reason: keyof typeof formErrorTexts,
  params?: ErrorParameters,
): APIError =>
  new APIError(
    formatErrorText(formErrorTexts[reason].en, params),
    status,
    { reason, params },
    true,
  );
