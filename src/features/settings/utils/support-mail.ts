import type { Locale, StaticTranslationString } from '@/types/types';

const subject: StaticTranslationString = {
  de: '[conveniat27 App] Support-Anfrage',
  en: '[conveniat27 App] Support Request',
  fr: '[conveniat27 App] Demande de support',
};

const body: StaticTranslationString = {
  de: 'Guten Tag,\nIch habe ein App-Problem.\n\n[Bitte beschreibe hier dein Problem]',
  en: 'Hello,\nI have an app issue.\n\n[Please describe your issue here]',
  fr: "Bonjour,\nJ'ai un problème avec l'application.\n\n[Veuillez décrire votre problème ici]",
};

const userIdLine: StaticTranslationString = {
  de: 'Meine Benutzer-ID: __ID__',
  en: 'My user ID: __ID__',
  fr: 'Mon ID utilisateur : __ID__',
};

/**
 * The mail to the app support, prefilled. A logged-in user's id goes into the body, so support
 * can find the account without the user having to look it up anywhere.
 */
export const supportMailLink = (supportEmail: string, locale: Locale, userId?: string): string => {
  const text =
    userId === undefined
      ? body[locale]
      : body[locale].replace('\n\n', `\n${userIdLine[locale].replace('__ID__', userId)}\n\n`);
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject[locale])}&body=${encodeURIComponent(text)}`;
};
