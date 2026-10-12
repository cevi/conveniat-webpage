import type { Locale, StaticTranslationString } from '@/types/types';

/** Shown where PostHog is configured: the question both the banner and the onboarding ask. */
export const analyticsConsentText: StaticTranslationString = {
  de: 'Wir zählen Seitenaufrufe und Fehler anonym und ohne Cookies. Dürfen wir zusätzlich mit PostHog Sitzungen aufzeichnen?',
  en: 'We count page views and errors anonymously and without cookies. May we also record sessions with PostHog?',
  fr: 'Nous comptons les pages vues et les erreurs de manière anonyme et sans cookies. Pouvons-nous en plus enregistrer des sessions avec PostHog ?',
};

export const learnMoreText: StaticTranslationString = {
  de: 'Mehr erfahren',
  en: 'Learn more',
  fr: 'En savoir plus',
};

/**
 * Where the privacy policy lives. The page belongs to the editors, so this breaks when its slug
 * changes; it is the same slug in every locale.
 */
export const privacyPolicyPath = (locale: Locale): string =>
  locale === 'de' ? '/datenschutz' : `/${locale}/datenschutz`;

/** Shown where PostHog is not configured, so there is nothing to ask. */
export const necessaryCookiesText: StaticTranslationString = {
  de: 'conveniat27 speichert Cookies, um richtig zu funktionieren.',
  en: 'conveniat27 saves cookies in order to function properly.',
  fr: 'conveniat27 utilise des cookies pour fonctionner correctement.',
};

export const acceptAnalyticsText: StaticTranslationString = {
  de: 'Akzeptieren',
  en: 'Accept',
  fr: 'Accepter',
};

export const necessaryCookiesOnlyText: StaticTranslationString = {
  de: 'Nur notwendige',
  en: 'Necessary only',
  fr: 'Nécessaires uniquement',
};

export const acknowledgeCookiesText: StaticTranslationString = {
  de: 'Verstanden',
  en: 'Got it',
  fr: 'Compris',
};

export const cookieSettingsText: StaticTranslationString = {
  de: 'Cookie-Einstellungen',
  en: 'Cookie settings',
  fr: 'Paramètres des cookies',
};
