import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { errorReasonOf, userErrorMessage } from '@/utils/user-error-message';
import type React from 'react';

const failedText: StaticTranslationString = {
  de: 'Das hat nicht geklappt. Versuche es nochmals.',
  en: 'That did not work. Please try again.',
  fr: 'Cela n’a pas fonctionné. Réessaie.',
};

/**
 * Whether the server refused because the block filled up since the page loaded. The status is
 * refetched on any refusal, and once it says "full" the page shows that itself: the line would
 * only repeat it next to a button that is gone or disabled.
 */
export const isFullRefusal = (error: unknown): boolean => {
  const reason = errorReasonOf(error)?.reason;
  return reason === 'workshopFull' || reason === 'shiftFull';
};

/**
 * Says under the enrolment why the last enrol, switch or withdrawal failed. The one way a
 * workshop and a shift report it, on the card and on the detail page: in place, next to the
 * button that failed, rather than in a toast over the page.
 */
export const EnrolmentFailure: React.FC<{
  error: unknown;
  locale: Locale;
  className?: string;
}> = ({ error, locale, className }) => (
  <p
    role="alert"
    className={cn(
      'bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium',
      className,
    )}
  >
    {userErrorMessage(error, locale, scheduleErrorTexts, failedText)}
  </p>
);
