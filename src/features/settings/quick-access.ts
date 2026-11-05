/**
 * The tiles of the Schnellzugriff on Home, by id. The router stores a choice of them per user;
 * the dashboard gives each one its icon, label and link.
 */
export const QUICK_ACCESS_TILE_IDS = [
  'upload',
  'qr',
  'material',
  'wristbands',
  'support',
  'schedule',
  'map',
  'chat',
  'helperShifts',
  'photoContest',
  'settings',
] as const;

export type QuickAccessTileId = (typeof QUICK_ACCESS_TILE_IDS)[number];

/** What Home shows until the user chooses otherwise. */
export const DEFAULT_QUICK_ACCESS: readonly QuickAccessTileId[] = [
  'upload',
  'qr',
  'material',
  'wristbands',
  'support',
];

const knownIds = new Set<string>(QUICK_ACCESS_TILE_IDS);

/**
 * The tile ids of a stored or sent choice, in their order, without duplicates and without ids
 * this release does not offer, such as one a later release dropped or an older client still
 * sends. Anything but an array is no choice at all.
 *
 * @param value - a stored choice, a request's input or a restored cache entry
 */
export const knownQuickAccessTiles = (value: unknown): QuickAccessTileId[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter(
    (id): id is QuickAccessTileId => typeof id === 'string' && knownIds.has(id),
  );
  return [...new Set(ids)];
};

/** Whether a choice is the default, tile for tile and in the same order. */
export const isDefaultQuickAccess = (tiles: readonly QuickAccessTileId[]): boolean =>
  tiles.length === DEFAULT_QUICK_ACCESS.length &&
  tiles.every((id, index) => id === DEFAULT_QUICK_ACCESS[index]);
