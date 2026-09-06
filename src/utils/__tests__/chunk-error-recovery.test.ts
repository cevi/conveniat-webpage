/**
 * @jest-environment jsdom
 */

import { attemptStaleBundleRecovery, isStaleBundleError } from '@/utils/chunk-error-recovery';
import { reloadPage } from '@/utils/reload-page';

jest.mock('@/utils/reload-page', () => ({
  reloadPage: jest.fn(),
}));

const mockedReloadPage = reloadPage as jest.MockedFunction<typeof reloadPage>;

const setOnline = (online: boolean): void => {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: online, configurable: true });
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

  it('drops the stale precache before reloading on a missing module factory', async () => {
    const unregister = jest.fn().mockResolvedValue(true);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { getRegistrations: jest.fn().mockResolvedValue([{ unregister }]) },
      configurable: true,
    });

    expect(
      attemptStaleBundleRecovery(
        new Error(
          'Module 1 was instantiated because it was required from module 2, but the module factory is not available.',
        ),
      ),
    ).toBe(true);

    // The reload waits for the unregister so it cannot pick the same precache back up.
    expect(mockedReloadPage).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(mockedReloadPage).toHaveBeenCalledTimes(1);
  });
});
