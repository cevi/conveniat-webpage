/**
 * @jest-environment jsdom
 */

type PreferencesModule = typeof import('@/lib/preferences');

/**
 * Loads the module as a freshly started app does: localStorage keeps what the last run
 * stored, everything held in memory is gone.
 */
const restartApp = async (): Promise<PreferencesModule> => {
  jest.resetModules();
  return import('@/lib/preferences');
};

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads a preference stored before the app restarted', async () => {
    const beforeRestart = await restartApp();
    beforeRestart.writePreference('native-push-opted-out', true);

    const afterRestart = await restartApp();

    expect(afterRestart.readPreference('native-push-opted-out')).toBe(true);
  });

  it('keeps the other preferences when the first write after a restart stores a new one', async () => {
    const firstRun = await restartApp();
    firstRun.writePreference('native-push-opted-out', true);

    const secondRun = await restartApp();
    secondRun.writePreference('offline-content-handled', true);

    const thirdRun = await restartApp();
    expect(thirdRun.readPreference('native-push-opted-out')).toBe(true);
    expect(thirdRun.readPreference('offline-content-handled')).toBe(true);
  });

  it('turns a preference back off', async () => {
    const { writePreference, readPreference } = await restartApp();
    writePreference('native-push-opted-out', true);
    writePreference('native-push-opted-out', false);

    expect(readPreference('native-push-opted-out')).toBe(false);
    const afterRestart = await restartApp();
    expect(afterRestart.readPreference('native-push-opted-out')).toBe(false);
  });

  it('falls back when nothing or something unreadable is stored', async () => {
    localStorage.setItem(
      'tanstack-db-user-preferences',
      JSON.stringify({
        's:native-push-opted-out': {
          versionKey: 'written-by-an-older-build',
          data: { key: 'native-push-opted-out', value: 'yes' },
        },
      }),
    );

    const { readPreference } = await restartApp();

    expect(readPreference('native-push-opted-out')).toBe(false);
    expect(readPreference('offline-content-accepted')).toBe(false);
  });

  it('keeps device preferences on logout and removes the personal and unknown ones', async () => {
    localStorage.setItem(
      'tanstack-db-user-preferences',
      JSON.stringify({
        's:no-longer-declared': {
          versionKey: 'legacy',
          data: { key: 'no-longer-declared', value: 1 },
        },
      }),
    );
    const { writePreference, clearPersonalPreferences } = await restartApp();
    writePreference('native-push-opted-out', true);
    writePreference('offline-content-handled', true);

    clearPersonalPreferences();

    const stored = JSON.parse(
      localStorage.getItem('tanstack-db-user-preferences') ?? '{}',
    ) as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(['s:native-push-opted-out']);
    const afterRestart = await restartApp();
    expect(afterRestart.readPreference('native-push-opted-out')).toBe(true);
    expect(afterRestart.readPreference('offline-content-handled')).toBe(false);
  });
});
