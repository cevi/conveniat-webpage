import { chatErrorTexts } from '@/features/chat/error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';

/** A refusal the chat components translate, see `chatErrorTexts`. */
export const chatError = createErrorThrower(chatErrorTexts);
