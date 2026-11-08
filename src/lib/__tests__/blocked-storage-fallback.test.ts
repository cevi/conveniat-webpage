import { installBlockedStorageFallback } from '@/lib/blocked-storage-fallback';

/** A window as a browser that blocks site data hands it out: reading either storage throws. */
const blockedWindow = (): Window =>
  Object.defineProperties({} as Window, {
    localStorage: {
      configurable: true,
      get: (): never => {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
    },
    sessionStorage: {
      configurable: true,
      get: (): never => {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
    },
    addEventListener: { value: (): void => {} },
    removeEventListener: { value: (): void => {} },
  });

describe('installBlockedStorageFallback', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('keeps values for the tab when the browser blocks storage', () => {
    const target = blockedWindow();

    installBlockedStorageFallback(target);
    target.localStorage.setItem('key', 'value');
    target.sessionStorage.setItem('key', 'other');

    expect(target.localStorage.getItem('key')).toBe('value');
    expect(target.sessionStorage.getItem('key')).toBe('other');
    expect(target.localStorage.length).toBe(1);
  });

  it('reports the fallback only once it replaced a storage', async () => {
    await jest.isolateModulesAsync(async () => {
      const fallback = await import('@/lib/blocked-storage-fallback');
      fallback.installBlockedStorageFallback({
        localStorage: {} as Storage,
        sessionStorage: {} as Storage,
      } as Window);
      expect(fallback.isStorageFallbackActive()).toBe(false);

      fallback.installBlockedStorageFallback(blockedWindow());
      expect(fallback.isStorageFallbackActive()).toBe(true);
    });
  });

  it('leaves working storage alone', () => {
    const localStorage = { getItem: (): null => null } as unknown as Storage;
    const sessionStorage = { getItem: (): null => null } as unknown as Storage;
    const target = { localStorage, sessionStorage } as Window;

    installBlockedStorageFallback(target);

    expect(target.localStorage).toBe(localStorage);
    expect(target.sessionStorage).toBe(sessionStorage);
  });

  /**
   * TanStack DB reads `window.localStorage` unguarded when the stars collection is created and on
   * every insert. Before the fallback, that failed the module and every page importing it.
   */
  it('lets the stars collection load and star where storage is blocked', async () => {
    const target = blockedWindow();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: target });

    installBlockedStorageFallback(target);

    await jest.isolateModulesAsync(async () => {
      const { setLocalStar, starsCollection } = await import('@/lib/tanstack-db');
      await starsCollection.preload();
      setLocalStar('entry-1', true);
      expect(starsCollection.get('entry-1')?.starred).toBe(true);
    });
  });
});
