import type { StaticTranslationString } from '@/types/types';

/**
 * Where the app sends a user whose session has expired. The parameter keeps the onboarding on
 * the login even when the network does not answer: otherwise it lets the user into the cached
 * app, the app sends them back here once the network answers, and on flaky wifi that repeats.
 */
export const SESSION_EXPIRED_ENTRYPOINT = '/entrypoint?session=expired';

export const offlineContentTitle: StaticTranslationString = {
  en: 'Offline Content',
  de: 'Offline Inhalte',
  fr: 'Contenu hors ligne',
};

export const offlineContentDescription: StaticTranslationString = {
  en: 'Do you want to download all maps and pages seamlessly for offline use? This might take a while.',
  de: 'Möchten Sie alle Karten und Seiten für die Offline-Nutzung herunterladen? Dies kann eine Weile dauern.',
  fr: 'Voulez-vous télécharger toutes les cartes et pages pour une utilisation hors ligne ? Cela peut prendre un certain temps.',
};

export const offlineContentDownloadButton: StaticTranslationString = {
  en: 'Download',
  de: 'Herunterladen',
  fr: 'Télécharger',
};

export const offlineContentNotNowButton: StaticTranslationString = {
  en: 'Not now',
  de: 'Nicht jetzt',
  fr: 'Pas maintenant',
};

export const offlineContentDownloading: StaticTranslationString = {
  en: 'Downloading...',
  de: 'Wird heruntergeladen...',
  fr: 'Téléchargement...',
};

export const offlineContentSuccess: StaticTranslationString = {
  en: 'Download complete!',
  de: 'Download abgeschlossen!',
  fr: 'Téléchargement terminé!',
};

export const offlineContentError: StaticTranslationString = {
  en: 'Download failed. Please try again later.',
  de: 'Download fehlgeschlagen. Bitte versuchen Sie es später erneut.',
  fr: 'Échec du téléchargement. Veuillez réessayer plus tard.',
};

export const offlineContentServiceWorkerError: StaticTranslationString = {
  en: 'Offline mode is currently unavailable.',
  de: 'Der Offline-Modus ist derzeit nicht verfügbar.',
  fr: 'Le mode hors ligne est actuellement indisponible.',
};

export const offlineContentRetryButton: StaticTranslationString = {
  en: 'Retry',
  de: 'Erneut versuchen',
  fr: 'Réessayer',
};
