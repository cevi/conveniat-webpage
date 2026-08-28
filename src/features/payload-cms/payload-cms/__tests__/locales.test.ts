/* eslint-disable n/no-process-env */
interface LocalesModule {
  enabledLocales: string[];
  locales: { code: string }[];
  LOCALE: Record<string, string>;
}

/**
 * Re-imports the locales module with the given `NEXT_PUBLIC_ENABLED_LOCALES` value. The flag is
 * read once, at module load, so every case needs a fresh module registry.
 */
const loadLocales = async (enabledLocales?: string): Promise<LocalesModule> => {
  if (enabledLocales === undefined) {
    delete process.env['NEXT_PUBLIC_ENABLED_LOCALES'];
  } else {
    process.env['NEXT_PUBLIC_ENABLED_LOCALES'] = enabledLocales;
  }

  let module_: LocalesModule | undefined;
  await jest.isolateModulesAsync(async () => {
    module_ = await import('@/features/payload-cms/payload-cms/locales');
  });

  return module_ as LocalesModule;
};

describe('enabled locales feature flag', () => {
  const originalValue = process.env['NEXT_PUBLIC_ENABLED_LOCALES'];

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env['NEXT_PUBLIC_ENABLED_LOCALES'];
    } else {
      process.env['NEXT_PUBLIC_ENABLED_LOCALES'] = originalValue;
    }
  });

  it('serves all locales when the flag is unset (conveniat27)', async () => {
    const { enabledLocales } = await loadLocales();

    expect(enabledLocales).toEqual(['de', 'fr', 'en']);
  });

  it('serves all locales when the flag is empty', async () => {
    const { enabledLocales } = await loadLocales('');

    expect(enabledLocales).toEqual(['de', 'fr', 'en']);
  });

  it('drops English when the flag lists German and French (konekta)', async () => {
    const { enabledLocales, locales } = await loadLocales('de,fr');

    expect(enabledLocales).toEqual(['de', 'fr']);
    expect(locales.map((locale) => locale.code)).toEqual(['de', 'fr']);
  });

  it('tolerates whitespace, casing and unknown codes', async () => {
    // `de` is kept unconditionally, so `FR` is what actually pins the trimming and lowercasing.
    const { enabledLocales } = await loadLocales(' de , FR , klingon ');

    expect(enabledLocales).toEqual(['de', 'fr']);
  });

  it('keeps the full locale union available for content shapes', async () => {
    const { LOCALE } = await loadLocales('de,fr');

    expect(Object.values(LOCALE)).toEqual(['de', 'fr', 'en']);
  });

  it('always keeps the default locale, even if the flag omits it', async () => {
    const { enabledLocales } = await loadLocales('fr');

    expect(enabledLocales).toEqual(['de', 'fr']);
  });
});
