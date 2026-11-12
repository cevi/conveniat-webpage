/** What the `app-feature-flags` global holds; `undefined` makes the next load fail. */
let stored: Record<string, unknown> | undefined;
let loads: number;
const evaluations: { flag: string; source: string }[] = [];

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({
      findGlobal: (): Promise<unknown> => {
        loads += 1;
        return stored === undefined
          ? Promise.reject(new Error('connection refused'))
          : Promise.resolve({ ...stored });
      },
    }),
}));
jest.mock('@/lib/telemetry/metrics', () => ({
  defineCounter: (): unknown => ({
    add: (_value: number, attributes: { flag: string; source: string }): void => {
      evaluations.push(attributes);
    },
  }),
}));

import {
  readFeatureFlag,
  readFeatureFlags,
  rememberSavedFeatureFlags,
} from '@/lib/read-feature-flags';

let now: number;
/** Lets a load started in the background finish. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  // every test starts on a fresh server process
  (globalThis as { featureFlagCache?: unknown }).featureFlagCache = undefined;
  stored = { forumEnabled: false };
  loads = 0;
  evaluations.length = 0;
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('reading feature flags', () => {
  it('reads what an admin saved, and the default of a flag nobody saved', async () => {
    await expect(readFeatureFlags(['forumEnabled', 'voiceCallsEnabled'])).resolves.toEqual({
      forumEnabled: false,
      voiceCallsEnabled: false,
    });
    await expect(readFeatureFlag('globalMessagingEnabled')).resolves.toBe(true);
  });

  it('loads once for reads that arrive together, and answers later ones from memory', async () => {
    await Promise.all([readFeatureFlag('forumEnabled'), readFeatureFlag('helperShiftsEnabled')]);
    await readFeatureFlag('forumEnabled');

    expect(loads).toBe(1);
  });

  it('applies a save at once, without waiting for the next load', async () => {
    await readFeatureFlag('forumEnabled');

    rememberSavedFeatureFlags({ forumEnabled: true });

    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(true);
    expect(loads).toBe(1);
  });

  it('picks up a change saved on another replica after five seconds', async () => {
    await readFeatureFlag('forumEnabled');
    stored = { forumEnabled: true };

    now += 4999;
    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(false);

    now += 1;
    // this read starts the reload and does not wait for it
    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(false);
    await settle();

    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(true);
  });
});

describe('while the flags cannot be loaded', () => {
  it('keeps the last values loaded', async () => {
    await readFeatureFlag('forumEnabled');
    stored = undefined;
    now += 5000;

    await readFeatureFlag('forumEnabled');
    await settle();

    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(false);
    expect(evaluations.at(-1)).toEqual({ flag: 'forum_enabled', source: 'last_known' });
  });

  it('starts with each flag closed where its default would open something up', async () => {
    stored = undefined;

    await expect(
      readFeatureFlags(['restrictContactList', 'contactListIncludesHof', 'forumEnabled']),
    ).resolves.toEqual({
      restrictContactList: true,
      contactListIncludesHof: false,
      forumEnabled: true,
    });
    expect(evaluations).toContainEqual({
      flag: 'contact_list_includes_hof',
      source: 'unavailable',
    });
  });

  it('tries again after five seconds, not on every read', async () => {
    stored = undefined;
    await readFeatureFlag('forumEnabled');
    await readFeatureFlag('forumEnabled');
    expect(loads).toBe(1);

    stored = { forumEnabled: false };
    now += 5000;

    await expect(readFeatureFlag('forumEnabled')).resolves.toBe(false);
    expect(loads).toBe(2);
    expect(evaluations.at(-1)).toEqual({ flag: 'forum_enabled', source: 'loaded' });
  });
});
