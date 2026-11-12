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
  tooManyRequests: {
    de: 'Das waren gerade sehr viele Anfragen. Versuche es in ein paar Minuten nochmals.',
    en: 'That was a lot of requests just now. Please try again in a few minutes.',
    fr: "C'étaient beaucoup de demandes d'un coup. Réessaie dans quelques minutes.",
  },
  termsChanged: {
    de: 'Die Bedingungen wurden in der Zwischenzeit geändert. Lade die Seite neu und bestätige sie nochmals.',
    en: 'The terms have changed in the meantime. Reload the page and agree to them again.',
    fr: 'Les conditions ont été modifiées entre-temps. Recharge la page et accepte-les à nouveau.',
  },
} satisfies Record<string, StaticTranslationString>;
