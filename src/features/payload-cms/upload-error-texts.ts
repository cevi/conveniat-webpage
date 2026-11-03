import type { StaticTranslationString } from '@/types/types';

/**
 * What the upload router tells a user when it refuses an image, by reason. The router throws the
 * reason with `createErrorThrower`, and `useUserUpload` translates it with `userErrorMessage`.
 */
export const uploadErrorTexts = {
  tooManyUploads: {
    de: 'Du hast gerade sehr viele Bilder hochgeladen. Versuche es in ein paar Minuten nochmals.',
    en: 'You have just uploaded a lot of images. Please try again in a few minutes.',
    fr: "Tu viens de téléverser beaucoup d'images. Réessaie dans quelques minutes.",
  },
} satisfies Record<string, StaticTranslationString>;
