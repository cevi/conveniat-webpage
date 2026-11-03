import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';

/** A refusal the schedule components translate, see `scheduleErrorTexts`. */
export const scheduleError = createErrorThrower(scheduleErrorTexts);

/**
 * The conflict as the previous release parsed it from the message, `Time conflict with
 * <kind>: <title>|<id>`, so a browser still running it opens its switch dialog. Remove once
 * no shell from before the reason codes is in use.
 */
export const legacyTimeConflict = (kind: 'workshop' | 'shift', title: string, id: string): string =>
  `Time conflict with ${kind}: ${title}|${id}`;

/** The message the previous release matched a passed withdrawal deadline on, see above. */
export const LEGACY_DEADLINE_PASSED = 'UNENROLLMENT_DEADLINE_PASSED';
