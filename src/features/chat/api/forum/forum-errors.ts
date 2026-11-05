import { forumErrorTexts } from '@/lib/forum-error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';

/** A refusal the forum pages translate, see `forumErrorTexts`. */
export const forumError = createErrorThrower(forumErrorTexts);
