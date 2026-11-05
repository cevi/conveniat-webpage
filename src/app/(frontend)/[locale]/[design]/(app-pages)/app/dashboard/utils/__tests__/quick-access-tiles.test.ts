import type { QuickAccessFlags } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import {
  DEFAULT_QUICK_ACCESS,
  isTileAvailable,
  moveTile,
  parseChosenTiles,
  tileOf,
  toggleTile,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';

const allOn: QuickAccessFlags = {
  imageUploadEnabled: true,
  materialEnabled: true,
  helperShiftsEnabled: true,
  photoContestEnabled: true,
};

describe('parseChosenTiles', () => {
  it('is the default until the user has chosen', () => {
    expect(parseChosenTiles(null)).toEqual(DEFAULT_QUICK_ACCESS);
    expect(parseChosenTiles('{not json')).toEqual(DEFAULT_QUICK_ACCESS);
  });

  it('keeps an empty choice empty', () => {
    expect(parseChosenTiles('[]')).toEqual([]);
  });

  it('drops tiles a later release no longer offers', () => {
    expect(parseChosenTiles('["map","forum","map","qr"]')).toEqual(['map', 'qr']);
  });
});

describe('isTileAvailable', () => {
  it('hides tiles that need an account from a guest', () => {
    expect(isTileAvailable(tileOf('qr'), { signedIn: false, flags: allOn })).toBe(false);
    expect(isTileAvailable(tileOf('map'), { signedIn: false, flags: allOn })).toBe(true);
  });

  it('hides a tile whose feature is off', () => {
    const flags = { ...allOn, photoContestEnabled: false };
    expect(isTileAvailable(tileOf('photoContest'), { signedIn: true, flags })).toBe(false);
  });
});

describe('toggleTile', () => {
  it('adds a tile at the end and removes it again', () => {
    const added = toggleTile(['qr', 'support'], 'map');
    expect(added).toEqual(['qr', 'support', 'map']);
    expect(toggleTile(added, 'qr')).toEqual(['support', 'map']);
  });
});

describe('moveTile', () => {
  const visible = new Set(['qr', 'support', 'map'] as const);

  it('swaps a tile with its neighbour', () => {
    expect(moveTile(['qr', 'support', 'map'], 'map', -1, visible)).toEqual([
      'qr',
      'map',
      'support',
    ]);
  });

  it('steps over a hidden tile, which keeps its place', () => {
    expect(moveTile(['qr', 'material', 'map'], 'map', -1, visible)).toEqual([
      'map',
      'material',
      'qr',
    ]);
  });

  it('leaves the first tile first and the last last', () => {
    expect(moveTile(['qr', 'map'], 'qr', -1, visible)).toEqual(['qr', 'map']);
    expect(moveTile(['qr', 'map', 'material'], 'map', 1, visible)).toEqual([
      'qr',
      'map',
      'material',
    ]);
  });
});
