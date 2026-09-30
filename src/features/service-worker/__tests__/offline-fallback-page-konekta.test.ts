import { offlinePageLocale } from '@/features/service-worker/offline-support/offline-fallback-page';

// konekta serves German and French only (`NEXT_PUBLIC_ENABLED_LOCALES=de,fr`)
jest.mock('@/features/payload-cms/payload-cms/locales', () => ({
  ...jest.requireActual<object>('@/features/payload-cms/payload-cms/locales'),
  enabledLocales: ['de', 'fr'],
}));

const ORIGIN = 'https://konekta.ch';

const localeFor = (
  path: string,
  { languages, localeCookie }: { languages: string[]; localeCookie?: string },
): Promise<string> => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false, languages },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'self', {
    value: {
      cookieStore: {
        get: () =>
          Promise.resolve(localeCookie === undefined ? undefined : { value: localeCookie }),
      },
    },
    configurable: true,
  });
  return offlinePageLocale(new URL(path, ORIGIN));
};

describe('the offline page on a deployment without English', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Reflect.deleteProperty(globalThis, 'self');
  });

  it('never answers in English, whatever the address, cookie or phone says', async () => {
    await expect(
      localeFor('/en/app/map', { languages: ['en-GB'], localeCookie: 'en' }),
    ).resolves.toBe('de');
  });

  it('takes the next language of the phone the deployment serves', async () => {
    await expect(localeFor('/app/map', { languages: ['en-GB', 'fr-CH'] })).resolves.toBe('fr');
  });
});
