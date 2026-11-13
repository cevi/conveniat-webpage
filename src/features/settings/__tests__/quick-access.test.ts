import {
  DEFAULT_QUICK_ACCESS,
  defaultQuickAccessOf,
  isDefaultQuickAccess,
  knownQuickAccessTiles,
} from '@/features/settings/quick-access';

describe('knownQuickAccessTiles', () => {
  it('is no choice for anything but an array, like a cache entry of an older release', () => {
    expect(knownQuickAccessTiles('map')).toBeUndefined();
    expect(knownQuickAccessTiles(null)).toBeUndefined();
    expect(knownQuickAccessTiles({ tiles: ['map'] })).toBeUndefined();
  });

  it('drops unknown and repeated ids and keeps the order', () => {
    expect(knownQuickAccessTiles(['map', 'forum', 3, 'map', 'qr'])).toEqual(['map', 'qr']);
  });
});

describe('defaultQuickAccessOf', () => {
  it('is the default the CMS configures, in its order', () => {
    expect(defaultQuickAccessOf(['map', 'schedule', 'chat'])).toEqual(['map', 'schedule', 'chat']);
  });

  it('falls back to the built-in default where the CMS names none', () => {
    // a global saved before the field existed, a draft emptied, an older cached configuration
    expect(defaultQuickAccessOf(null)).toEqual(DEFAULT_QUICK_ACCESS);
    expect(defaultQuickAccessOf([])).toEqual(DEFAULT_QUICK_ACCESS);
    expect(defaultQuickAccessOf(['forum'])).toEqual(DEFAULT_QUICK_ACCESS);
  });
});

describe('isDefaultQuickAccess', () => {
  it('is the default only in the default order', () => {
    const defaults = ['map', 'schedule', 'chat'] as const;
    expect(isDefaultQuickAccess(['map', 'schedule', 'chat'], defaults)).toBe(true);
    expect(isDefaultQuickAccess(['schedule', 'map', 'chat'], defaults)).toBe(false);
    expect(isDefaultQuickAccess(DEFAULT_QUICK_ACCESS, defaults)).toBe(false);
    expect(isDefaultQuickAccess([], defaults)).toBe(false);
  });
});
