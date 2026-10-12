import type { StaticTranslationString } from '@/types/types';

/** Shown where PostHog is configured: the question both the banner and the onboarding ask. */
export const analyticsConsentText: StaticTranslationString = {
  de: 'Dürfen wir mit PostHog auswerten, wie du conveniat27 nutzt, und dabei Sitzungen aufzeichnen?',
  en: 'May we use PostHog to analyse how you use conveniat27 and record sessions?',
  fr: 'Pouvons-nous analyser avec PostHog ton utilisation de conveniat27 et enregistrer des sessions ?',
};

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
