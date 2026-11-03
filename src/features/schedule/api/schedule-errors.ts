import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';

/** A refusal the schedule components translate, see `scheduleErrorTexts`. */
export const scheduleError = createErrorThrower(scheduleErrorTexts);
