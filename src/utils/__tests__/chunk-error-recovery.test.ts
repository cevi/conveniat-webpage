/**
 * @jest-environment jsdom
 */

import {
  attemptMixedBuildRecovery,
  attemptStaleBundleRecovery,
  isStaleBundleError,
} from '@/utils/chunk-error-recovery';
import { reloadPage } from '@/utils/reload-page';

jest.mock('@/utils/reload-page', () => ({
  reloadPage: jest.fn(),
}));

const mockedReloadPage = reloadPage as jest.MockedFunction<typeof reloadPage>;

const setOnline = (online: boolean): void => {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: online, configurable: true });
};

const registerServiceWorker = (registration: Partial<ServiceWorkerRegistration>): void => {
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: { getRegistrations: jest.fn().mockResolvedValue([registration]) },
    configurable: true,
  });
};

describe('isStaleBundleError', () => {
  it.each([
    [
      'a webpack chunk failure by name',
      Object.assign(new Error('boom'), { name: 'ChunkLoadError' }),
    ],
    [
      'a turbopack chunk failure by message',
      new Error('Failed to load chunk /_next/static/chunks/0jn6r.dy2amix.js from module 589284'),
    ],
    [
      'a turbopack module id that the current bundle does not register',
      new Error(
        'Module 928748 was instantiated because it was required from module 73791, but the module factory is not available.',
      ),
    ],
    ['a failed dynamic import', new Error('Failed to fetch dynamically imported module')],
    ['a serwist precache mismatch', new Error('bad-precaching-response')],
    ['an HTML error page served in place of a script', new SyntaxError("Unexpected token '<'")],
  ])('recognises %s', (_label, error) => {
    expect(isStaleBundleError(error)).toBe(true);
  });

  it('reads the fallback message when the thrown value carries none', () => {
    expect(isStaleBundleError({}, 'Loading chunk 42 failed')).toBe(true);
  });

  it.each([
    ['an application bug', new TypeError("Cannot read properties of undefined (reading 'id')")],
    ['a dropped request', new TypeError('Failed to fetch')],
    ['a server render failure', new Error('An error occurred in the Server Components render')],
  ])('does not claim %s', (_label, error) => {
    expect(isStaleBundleError(error)).toBe(false);
  });
});

describe('attemptStaleBundleRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    setOnline(true);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reloads onto the current build for a stale-bundle error', () => {
    expect(attemptStaleBundleRecovery(new Error('Failed to load chunk /_next/static/a.js'))).toBe(
      true,
    );
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });

  it('leaves unrelated errors alone', () => {
    expect(attemptStaleBundleRecovery(new TypeError('x is not a function'))).toBe(false);
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  it('does not reload while offline, so the offline fallbacks stay in charge', () => {
    setOnline(false);
    expect(attemptStaleBundleRecovery(new Error('Failed to load chunk /_next/static/a.js'))).toBe(
      false,
    );
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  it('reloads only once when the same error comes back straight away', () => {
    const error = new Error('Failed to load chunk /_next/static/a.js');

    expect(attemptStaleBundleRecovery(error)).toBe(true);
    expect(attemptStaleBundleRecovery(error)).toBe(false);
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads again once the guard window has passed', () => {
    const error = new Error('Failed to load chunk /_next/static/a.js');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(attemptStaleBundleRecovery(error)).toBe(true);

    jest.spyOn(Date, 'now').mockReturnValue(now + 10_001);
    expect(attemptStaleBundleRecovery(error)).toBe(true);
    expect(mockedReloadPage).toHaveBeenCalledTimes(2);
  });

  const missingModuleFactory = new Error(
    'Module 1 was instantiated because it was required from module 2, but the module factory is not available.',
  );

  // Unregistering deactivates the push subscription of the registration, and nothing brings
  // it back: the phone would stop receiving pushes after a deploy.
  it('keeps the service worker registered, and with it the push subscription', async () => {
    const unregister = jest.fn().mockResolvedValue(true);
    const update = jest.fn(() => Promise.resolve());
    registerServiceWorker({ unregister, update });

    expect(attemptStaleBundleRecovery(missingModuleFactory)).toBe(true);

    // The reload waits for the update check so it can land on the current worker.
    expect(mockedReloadPage).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(update).toHaveBeenCalledTimes(1);
    expect(unregister).not.toHaveBeenCalled();
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway when the update check never answers', async () => {
    jest.useFakeTimers();
    registerServiceWorker({ update: jest.fn(() => new Promise<never>(() => {})) });

    expect(attemptStaleBundleRecovery(missingModuleFactory)).toBe(true);

    await jest.advanceTimersByTimeAsync(3000);
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

// what 1.45.0 threw: a chunk of 1.44.0 reading an export the current module renamed
const renamedExport = new TypeError(
  "undefined is not an object (evaluating 'o.f.OFFLINE_DOWNLOAD_PROGRESS')",
);

/** A page controlled by a worker whose precache holds `precached`, running `scripts`. */
const setUpPage = (scripts: string[], precached: string[]): void => {
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: { controller: {}, getRegistrations: jest.fn().mockResolvedValue([]) },
    configurable: true,
  });
  const precache = {
    keys: jest
      .fn()
      .mockResolvedValue(precached.map((path) => ({ url: `${location.origin}${path}` }))),
  };
  Object.defineProperty(globalThis, 'caches', {
    value: {
      keys: jest
        .fn()
        .mockResolvedValue(['pages-cache-v1', `serwist-precache-v2-${location.origin}/`]),
      open: jest.fn().mockResolvedValue(precache),
    },
    configurable: true,
  });
  document.head.innerHTML = '';
  for (const source of scripts) {
    const script = document.createElement('script');
    script.src = source;
    document.head.append(script);
  }
  const inline = document.createElement('script');
  inline.textContent = 'self.__next_f = []';
  document.head.append(inline);
};

describe('attemptMixedBuildRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    setOnline(true);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reloads when the page runs a chunk the current build does not ship', async () => {
    setUpPage(
      ['/_next/static/chunks/current-a.js', '/_next/static/chunks/previous-build.js'],
      ['/_next/static/chunks/current-a.js', '/_next/static/chunks/current-b.js'],
    );

    await expect(attemptMixedBuildRecovery(renamedExport)).resolves.toBe(true);
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });

  it('leaves an error in a page of the current build to the error page', async () => {
    setUpPage(
      ['/_next/static/chunks/current-a.js', 'https://eu-assets.i.posthog.com/static/array.js'],
      ['/_next/static/chunks/current-a.js'],
    );

    await expect(attemptMixedBuildRecovery(renamedExport)).resolves.toBe(false);
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  it('reloads only once when the mixed page comes back straight away', async () => {
    setUpPage(['/_next/static/chunks/previous-build.js'], ['/_next/static/chunks/current-a.js']);

    await expect(attemptMixedBuildRecovery(renamedExport)).resolves.toBe(true);
    await expect(attemptMixedBuildRecovery(renamedExport)).resolves.toBe(false);
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });

  it('cannot tell without a worker controlling the page, and does not reload', async () => {
    setUpPage(['/_next/static/chunks/previous-build.js'], ['/_next/static/chunks/current-a.js']);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { controller: undefined },
      configurable: true,
    });

    await expect(attemptMixedBuildRecovery(renamedExport)).resolves.toBe(false);
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });
});
