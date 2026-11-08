import type { CallEndReason } from '@/features/chat/calls/call-engine';
import type { StaticTranslationString } from '@/types/types';

/** The call button's label, `{name}` is the partner. */
export const callButtonText: StaticTranslationString = {
  de: '{name} anrufen',
  en: 'Call {name}',
  fr: 'Appeler {name}',
};

export const acceptText: StaticTranslationString = {
  de: 'Annehmen',
  en: 'Accept',
  fr: 'Accepter',
};

export const declineText: StaticTranslationString = {
  de: 'Ablehnen',
  en: 'Decline',
  fr: 'Refuser',
};

export const hangUpText: StaticTranslationString = {
  de: 'Auflegen',
  en: 'Hang up',
  fr: 'Raccrocher',
};

export const closeText: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

export const muteText: StaticTranslationString = {
  de: 'Stumm',
  en: 'Mute',
  fr: 'Muet',
};

export const callingText: StaticTranslationString = {
  de: 'Klingelt …',
  en: 'Ringing …',
  fr: 'Ça sonne …',
};

export const incomingText: StaticTranslationString = {
  de: 'ruft dich an',
  en: 'is calling you',
  fr: 't’appelle',
};

export const connectingText: StaticTranslationString = {
  de: 'Verbinden …',
  en: 'Connecting …',
  fr: 'Connexion …',
};

export const reconnectingText: StaticTranslationString = {
  de: 'Verbindung unterbrochen, verbinde neu …',
  en: 'Connection lost, reconnecting …',
  fr: 'Connexion interrompue, reconnexion …',
};

export const callDialogLabel: StaticTranslationString = {
  de: 'Anruf',
  en: 'Call',
  fr: 'Appel',
};

export const endReasonTexts: Record<Exclude<CallEndReason, 'error'>, StaticTranslationString> = {
  hungUp: { de: 'Anruf beendet', en: 'Call ended', fr: 'Appel terminé' },
  partnerHungUp: { de: 'Aufgelegt', en: 'Hung up', fr: 'A raccroché' },
  declined: { de: 'Abgelehnt', en: 'Declined', fr: 'Refusé' },
  busy: { de: 'Besetzt', en: 'Busy', fr: 'Occupé' },
  noAnswer: { de: 'Keine Antwort', en: 'No answer', fr: 'Pas de réponse' },
  missed: { de: 'Verpasster Anruf', en: 'Missed call', fr: 'Appel manqué' },
  connectionLost: {
    de: 'Verbindung verloren',
    en: 'Connection lost',
    fr: 'Connexion perdue',
  },
  micDenied: {
    de: 'Ohne Mikrofon geht kein Anruf. Erlaube den Zugriff in den Einstellungen deines Telefons oder Browsers und versuche es nochmals.',
    en: 'A call needs the microphone. Allow access in the settings of your phone or browser and try again.',
    fr: 'Un appel a besoin du micro. Autorise l’accès dans les réglages de ton téléphone ou navigateur et réessaie.',
  },
  micUnavailable: {
    de: 'Das Mikrofon ist gerade nicht verfügbar. Vielleicht braucht es eine andere App, oder dein Gerät hat keines.',
    en: 'The microphone is not available right now. Another app may be using it, or your device has none.',
    fr: 'Le micro n’est pas disponible pour le moment. Une autre app l’utilise peut-être, ou ton appareil n’en a pas.',
  },
};
