/** A `Storage` that lives only as long as the tab. */
const createTabStorage = (): Storage => {
  const entries = new Map<string, string>();
  return {
    get length(): number {
      return entries.size;
    },
    key: (index: number): string | null => [...entries.keys()][index] ?? null,
    getItem: (key: string): string | null => entries.get(String(key)) ?? null,
    setItem: (key: string, value: string): void => {
      entries.set(String(key), String(value));
    },
    removeItem: (key: string): void => {
      entries.delete(String(key));
    },
    clear: (): void => {
      entries.clear();
    },
  };
};

/**
 * Gives `localStorage` and `sessionStorage` a stand-in for the tab when the browser blocks them.
 *
 * A browser set to block cookies and site data for the site (a setting in Chrome, Edge and Brave)
 * throws a `SecurityError` on merely reading `window.localStorage` or `window.sessionStorage`.
 * Our code and our libraries, TanStack DB among them, read them unguarded, and the first module
 * to do so at load time took the whole page down with it. Run this before any of them: a person
 * who blocks storage then keeps stars, preferences and drafts for the tab only.
 *
 * @param target - The window whose storages to check, the global one in the browser.
 */
export const installBlockedStorageFallback = (target: Window): void => {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      void target[name];
    } catch {
      Object.defineProperty(target, name, { value: createTabStorage(), configurable: true });
    }
  }
};
