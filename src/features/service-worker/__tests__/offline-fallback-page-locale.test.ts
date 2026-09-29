import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

/** Nothing was ever stored for offline use, not even the offline page. */
const emptyCaches = (): CacheStorage => {
  const emptyCache = {
    match: jest.fn(() => Promise.resolve()),
    keys: jest.fn(() => Promise.resolve([])),
    put: jest.fn(() => Promise.resolve()),
  };
  return {
    open: () => Promise.resolve(emptyCache),
    match: () => Promise.resolve(),
  } as unknown as CacheStorage;
};

/**
 * Opens `path` offline on a phone set to `languages`, with the app's locale cookie set to
 * `localeCookie`, and returns the text of the page the worker writes.
 */
const openOffline = async (
  path: string,
  { languages = ['de-CH'], localeCookie }: { languages?: string[]; localeCookie?: string } = {},
): Promise<string> => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false, languages },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'self', {
    value: {
      location: { origin: ORIGIN },
      cookieStore: {
        get: (name: string) =>
          Promise.resolve(
            name === 'next-locale' && localeCookie !== undefined
              ? { value: localeCookie }
              : undefined,
          ),
      },
    },
    configurable: true,
  });

  let answer: Promise<Response> | undefined;
  const event = {
    request: new Request(`${ORIGIN}${path}`, { mode: 'same-origin' }),
    clientId: '',
    resultingClientId: 'client-1',
    respondWith: (response: Promise<Response>): void => {
      answer = response;
    },
    waitUntil: jest.fn(),
  };
  Object.defineProperty(event.request, 'destination', { value: 'document' });
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  if (answer === undefined) throw new Error('the worker did not answer the page request');
  const response = await answer;
  return response.text();
};

describe('the offline page the worker writes itself', () => {
  const originalCaches = globalThis.caches;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    globalThis.caches = emptyCaches();
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'self');
  });

  it('speaks German by default', async () => {
    const page = await openOffline('/app/material');

    expect(page).toContain('<html lang="de">');
    expect(page).toContain('Du bist offline');
  });

  it('speaks the language of the address', async () => {
    const page = await openOffline('/fr/programm');

    expect(page).toContain('<html lang="fr">');
    expect(page).toContain('Vous êtes hors ligne');
  });

  it('speaks the language chosen in the app, whatever the phone is set to', async () => {
    const page = await openOffline('/app/material', { languages: ['de-CH'], localeCookie: 'en' });

    expect(page).toContain("You're offline");
  });

  it('speaks the language of the phone when the app has none stored', async () => {
    const page = await openOffline('/app/material', { languages: ['it-CH', 'fr-CH'] });

    expect(page).toContain('Vous êtes hors ligne');
  });
});
