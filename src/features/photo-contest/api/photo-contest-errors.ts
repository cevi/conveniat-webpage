import { photoContestErrorTexts } from '@/features/photo-contest/error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';

/** A refusal the photo contest view translates, see `photoContestErrorTexts`. */
export const photoContestError = createErrorThrower(photoContestErrorTexts);
