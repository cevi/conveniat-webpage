/**
 * Keeps the Cevi.DB sign-in pages out of the app's back stack.
 *
 * The OAuth flow leaves the Cevi.DB pages (sign-in form, consent) in the session history between
 * the page that started the login and the page the callback lands on. A back gesture after login
 * then opens Cevi.DB inside the app. A page cannot delete history entries, and entries of another
 * origin cannot be replaced, so after the callback the app traverses back to the entry that started
 * the login and replaces it with the landing page. The Cevi.DB entries end up ahead of the current
 * entry, where a back gesture never reaches them.
 */

const INDEX_BEFORE_LOGIN_KEY = 'login_history_index';
const RETURN_TO_KEY = 'login_history_return_to';

/** Only the part of the Navigation API this file reads; TypeScript 5.7 does not ship its types. */
interface NavigationHistory {
  currentEntry: { index: number } | null;
  entries: () => unknown[];
}

const readNavigation = (): NavigationHistory | undefined =>
  (globalThis as typeof globalThis & { navigation?: NavigationHistory }).navigation;

/**
 * Index of the current entry in the whole session history. `history` only exposes its length, so
 * same-origin entries ahead of the current one, which the Navigation API lists, are subtracted.
 * Without the Navigation API the current entry is assumed to be the last one.
 */
const currentHistoryIndex = (): number => {
  const navigation = readNavigation();
  const index = navigation?.currentEntry?.index;
  const entriesAhead =
    navigation === undefined || index === undefined ? 0 : navigation.entries().length - 1 - index;
  return globalThis.history.length - 1 - entriesAhead;
};

/** Records where the login started. Call right before handing the browser to Cevi.DB. */
export const rememberHistoryBeforeLogin = (): void => {
  try {
    sessionStorage.setItem(INDEX_BEFORE_LOGIN_KEY, String(currentHistoryIndex()));
  } catch {
    // sessionStorage may be unavailable (private mode); the back stack then keeps Cevi.DB.
  }
};

/**
 * Runs on every page load of the app. On the page the login callback lands on, it goes back to the
 * entry that started the login; on that entry, it replaces it with the landing page.
 */
export const rewindHistoryAfterLogin = (): void => {
  try {
    const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
    if (returnTo !== null) {
      sessionStorage.removeItem(RETURN_TO_KEY);
      globalThis.location.replace(returnTo);
      return;
    }

    const storedIndex = sessionStorage.getItem(INDEX_BEFORE_LOGIN_KEY);
    if (storedIndex === null) return;
    sessionStorage.removeItem(INDEX_BEFORE_LOGIN_KEY);

    // The callback page was just pushed, so it is the last entry. One step back is the page that
    // started the login itself, which happens when Cevi.DB still had a session and only redirected.
    const steps = globalThis.history.length - 1 - Number.parseInt(storedIndex, 10);
    if (!Number.isInteger(steps) || steps < 2) return;

    sessionStorage.setItem(RETURN_TO_KEY, globalThis.location.href);
    globalThis.history.go(-steps);
  } catch {
    // sessionStorage may be unavailable (private mode); the back stack then keeps Cevi.DB.
  }
};
