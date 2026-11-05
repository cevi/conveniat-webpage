import { toast } from '@/components/ui/toast';
import { materialErrorTexts } from '@/features/material/error-texts';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';

/** Tells the user why a material call failed, in the language of the page. */
export const toastMaterialError = (error: unknown, locale: Locale): void => {
  toast.error(userErrorMessage(error, locale, materialErrorTexts));
};
