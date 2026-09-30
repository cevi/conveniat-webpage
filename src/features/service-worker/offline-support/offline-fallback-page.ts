import { enabledLocales, LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';

declare const self: ServiceWorkerGlobalScope & {
  cookieStore?: { get: (name: string) => Promise<{ value: string } | null> };
};

const offlineTitle: StaticTranslationString = {
  de: 'Du bist offline',
  en: "You're offline",
  fr: 'Vous êtes hors ligne',
};

const pageNotAvailable: StaticTranslationString = {
  de: 'Diese Seite ist offline noch nicht verfügbar.',
  en: 'This page is not available offline yet.',
  fr: "Cette page n'est pas encore disponible hors ligne.",
};

const tryAgain: StaticTranslationString = {
  de: 'Erneut versuchen',
  en: 'Try again',
  fr: 'Réessayer',
};

const reconnecting: StaticTranslationString = {
  de: 'Verbindung wird wiederhergestellt',
  en: 'Reconnecting',
  fr: 'Reconnexion en cours',
};

const asEnabledLocale = (code: string | undefined): Locale | undefined =>
  enabledLocales.find((locale) => locale === code?.toLowerCase());

/** `fr-CH` → `fr`: device languages carry a region the app's locales do not. */
const asEnabledLanguage = (language: string): Locale | undefined =>
  asEnabledLocale(language.split('-')[0]);

/**
 * The locale to answer a page request in when the worker has to write the page itself.
 *
 * The same order the app uses, as far as a worker can see it: a locale prefix in the address,
 * then the locale cookie, then the device language. App pages have no prefix, and a worker
 * cannot read the `Cookie` header, so the cookie comes from the Cookie Store API where the
 * browser has one.
 */
export const offlinePageLocale = async (url: URL): Promise<Locale> => {
  const fromPath = asEnabledLocale(url.pathname.split('/')[1]);
  if (fromPath !== undefined) return fromPath;

  try {
    const cookie = await self.cookieStore?.get(Cookie.LOCALE_COOKIE);
    const fromCookie = asEnabledLocale(cookie?.value);
    if (fromCookie !== undefined) return fromCookie;
  } catch {
    // no cookie access in this browser or context, fall through to the device language
  }

  for (const language of navigator.languages) {
    const fromDevice = asEnabledLanguage(language);
    if (fromDevice !== undefined) return fromDevice;
  }

  return LOCALE.DE;
};

/** The page shown for a page that was never stored for offline use. */
export const offlinePageHtml = (locale: Locale): string =>
  `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | conveniat</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:16px}h1{font-size:24px;margin-bottom:8px}p{color:#9ca3af;margin-bottom:24px}button{background:#2563eb;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer}</style></head><body><div><h1>${offlineTitle[locale]}</h1><p>${pageNotAvailable[locale]}</p><button onclick="window.location.reload()">${tryAgain[locale]}</button></div><script>addEventListener('online',function(){location.reload()})</script></body></html>`;

/** The page shown while a page request that bypasses the worker's caches cannot get through. */
export const reconnectingPageHtml = (locale: Locale): string =>
  `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><meta http-equiv="refresh" content="2"></head>` +
  '<body style="font-family:sans-serif;text-align:center;padding-top:100px;background:#f9fafb;color:#6b7280;">' +
  `${reconnecting[locale]}</body></html>`;
