import {
  DEFAULT_QUICK_ACCESS,
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

describe('isDefaultQuickAccess', () => {
  it('is the default only in the default order', () => {
    expect(isDefaultQuickAccess(DEFAULT_QUICK_ACCESS)).toBe(true);
    expect(isDefaultQuickAccess(['qr', 'upload', 'material', 'support'])).toBe(false);
    expect(isDefaultQuickAccess([])).toBe(false);
  });
});
