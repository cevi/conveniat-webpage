import type { QuickAccessFlags } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import {
  isTileAvailable,
  moveTile,
  QUICK_ACCESS_TILES,
  tileOf,
  toggleTile,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { QUICK_ACCESS_TILE_IDS } from '@/features/settings/quick-access';

const allOn: QuickAccessFlags = {
  imageUploadEnabled: true,
  materialEnabled: true,
  helperShiftsEnabled: true,
  photoContestEnabled: true,
  wristbandsEnabled: true,
  storyEnabled: true,
};

describe('QUICK_ACCESS_TILES', () => {
  it('has one tile for every id the server stores', () => {
    expect(QUICK_ACCESS_TILES.map((tile) => tile.id)).toEqual([...QUICK_ACCESS_TILE_IDS]);
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

  it('steps over a hidden tile, and every other tile keeps its order', () => {
    expect(moveTile(['qr', 'material', 'map'], 'map', -1, visible)).toEqual([
      'map',
      'qr',
      'material',
    ]);
    expect(moveTile(['qr', 'material', 'map'], 'qr', 1, visible)).toEqual([
      'material',
      'map',
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
