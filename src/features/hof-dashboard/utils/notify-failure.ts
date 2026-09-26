import { translate, type TextKey } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { toast } from 'sonner';

/**
 * Tells the user an action failed, and says so plainly when the phone has no signal: on camp
 * wifi that is the likely cause, and "failed" alone reads like a bug.
 */
export const notifyFailure = (locale: Locale, key: TextKey): void => {
  toast.error(translate(globalThis.navigator.onLine ? key : 'offline', locale));
};
