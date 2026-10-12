import type { StaticTranslationString } from '@/types/types';

/** Shown where PostHog is configured: the question both the banner and the onboarding ask. */
export const analyticsConsentText: StaticTranslationString = {
  de: 'conveniat27 braucht einige Cookies, um zu funktionieren. Dürfen wir zusätzlich mit PostHog auswerten, wie du die Seite nutzt, und dabei Fehler und einzelne Sitzungen aufzeichnen? Das hilft uns, sie zu verbessern.',
  en: 'conveniat27 needs a few cookies to work. May we also use PostHog to analyse how you use the site, and record errors and individual sessions while doing so? It helps us improve it.',
  fr: "conveniat27 a besoin de quelques cookies pour fonctionner. Pouvons-nous en plus analyser avec PostHog la façon dont tu utilises le site, et enregistrer des erreurs et certaines sessions ? Cela nous aide à l'améliorer.",
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
