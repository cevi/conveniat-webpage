import type { StaticTranslationString } from '@/types/types';

export const errorMessageTranslation: StaticTranslationString = {
  de: 'Es ist ein Fehler aufgetreten',
  en: 'Something went wrong',
  fr: "Une erreur s'est produite",
};

export const offlineTitleTranslation: StaticTranslationString = {
  de: 'Sie sind offline',
  en: 'You are offline',
  fr: 'Vous êtes hors ligne',
};

export const offlineDescriptionTranslation: StaticTranslationString = {
  de: 'Diese Inhalte können ohne Internetverbindung nicht geladen werden. Bitte überprüfen Sie Ihre Verbindung.',
  en: 'This content cannot be loaded without an internet connection. Please check your connection.',
  fr: 'Ce contenu ne peut pas être chargé sans connexion Internet. Veuillez vérifier votre connexion.',
};

export const retryButtonTranslation: StaticTranslationString = {
  de: 'Erneut versuchen',
  en: 'Try Again',
  fr: 'Réessayer',
};

export const offlineLongTextTranslation: StaticTranslationString = {
  en: "It looks like you've lost your internet connection. Please check your network settings or try again later.",
  de: 'Es sieht so aus, als hätten Sie Ihre Internetverbindung verloren. Bitte überprüfen Sie Ihre Netzwerkeinstellungen oder versuchen Sie es später erneut.',
  fr: 'Il semble que vous ayez perdu votre connexion Internet. Veuillez vérifier vos paramètres réseau ou réessayer plus tard.',
};

export const noConnectionTranslation: StaticTranslationString = {
  de: 'Keine Verbindung. Versuche es erneut, sobald du wieder Empfang hast.',
  en: 'No connection. Try again once you have signal.',
  fr: 'Pas de connexion. Réessaie dès que tu as du réseau.',
};

export const invalidInputTranslation: StaticTranslationString = {
  de: 'Die Angaben sind ungültig. Lade die Seite neu und versuche es nochmals.',
  en: 'The input is invalid. Reload the page and try again.',
  fr: 'Les données sont invalides. Recharge la page et réessaie.',
};
