/**
 * The onboarding flow, the main menu, the desktop nav and the settings page all render their
 * language picker from `languageOptions`, so this is the single place that decides which
 * languages a visitor can pick. A locale the deployment does not serve must never show up here.
 */
interface LanguageOptionsModule {
  languageOptions: { value: string; label: string }[];
}

const loadLanguageOptions = async (enabledLocales: string[]): Promise<LanguageOptionsModule> => {
  let module_: LanguageOptionsModule | undefined;

  await jest.isolateModulesAsync(async () => {
    jest.doMock('@/features/payload-cms/payload-cms/locales', () => ({
      LOCALE: { DE: 'de', FR: 'fr', EN: 'en' },
      enabledLocales,
    }));

    module_ = await import('@/config/language-options');
  });

  return module_ as LanguageOptionsModule;
};

describe('language options', () => {
  afterEach(() => {
    jest.dontMock('@/features/payload-cms/payload-cms/locales');
  });

  it('offers every language when all locales are served (conveniat27)', async () => {
    const { languageOptions } = await loadLanguageOptions(['de', 'fr', 'en']);

    expect(languageOptions).toEqual([
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
    ]);
  });

  it('does not offer English when the deployment does not serve it (konekta)', async () => {
    const { languageOptions } = await loadLanguageOptions(['de', 'fr']);

    expect(languageOptions).toEqual([
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
    ]);
    expect(languageOptions.map((option) => option.value)).not.toContain('en');
  });
});
