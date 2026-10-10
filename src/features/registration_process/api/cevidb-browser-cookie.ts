import type { StaticTranslationString } from '@/types/types';

/** What is wrong with a pasted Cevi.DB cookie header, if anything. */
export type BrowserCookieProblem = 'no-session' | 'no-remember-token';

/** Typed into the field to delete the stored cookie. */
export const CLEAR_COOKIE_KEYWORD = 'CLEAR';

const cookieNames = (header: string): Set<string> =>
  new Set(
    header
      .split(';')
      .map((part) => part.split('=')[0]?.trim() ?? '')
      .filter((name) => name !== ''),
  );

/**
 * Checks that a pasted cookie header is the one the Cevi.DB session needs.
 *
 * The two ways of getting it wrong look fine until hours later. Copying a single cookie
 * value instead of the header leaves out `_session_id`, and nothing is signed in at all.
 * Signing in without "Angemeldet bleiben" leaves out `remember_person_token`, and the
 * session then ends for good the first time it goes thirty minutes without a request —
 * one restart of this app at the wrong moment.
 *
 * Empty means "keep what is stored" and the clear keyword deletes it, so neither is a
 * cookie to check.
 */
export const findBrowserCookieProblem = (value: unknown): BrowserCookieProblem | undefined => {
  if (typeof value !== 'string') return undefined;
  const header = value.trim();
  if (header === '' || header === CLEAR_COOKIE_KEYWORD) return undefined;

  const names = cookieNames(header);
  if (!names.has('_session_id')) return 'no-session';
  if (!names.has('remember_person_token')) return 'no-remember-token';
  return undefined;
};

export const browserCookieProblemMessages: Record<BrowserCookieProblem, StaticTranslationString> = {
  'no-session': {
    de: 'Das ist nicht der Cookie-Header der Cevi.DB: «_session_id» fehlt. Bitte den ganzen Wert des Headers «Cookie» einer Anfrage an die Cevi.DB einfügen, nicht ein einzelnes Cookie.',
    en: 'This is not the Cevi.DB cookie header: "_session_id" is missing. Paste the whole value of the "Cookie" header of a request to Cevi.DB, not a single cookie.',
    fr: "Ce n'est pas l'en-tête de cookies de Cevi.DB : « _session_id » manque. Coller toute la valeur de l'en-tête « Cookie » d'une requête à Cevi.DB, pas un seul cookie.",
  },
  'no-remember-token': {
    de: 'Im Cookie fehlt «remember_person_token». Bitte in der Cevi.DB mit «Angemeldet bleiben» neu anmelden und den Cookie-Header erneut kopieren, sonst läuft die Sitzung nach 30 Minuten ohne Anfrage endgültig ab.',
    en: 'The cookie has no "remember_person_token". Sign in to Cevi.DB again with "Remember me" ticked and copy the cookie header again, otherwise the session ends for good after 30 minutes without a request.',
    fr: "Le cookie ne contient pas « remember_person_token ». Se reconnecter à Cevi.DB en cochant « Se souvenir de moi » et copier à nouveau l'en-tête, sinon la session expire définitivement après 30 minutes sans requête.",
  },
};
