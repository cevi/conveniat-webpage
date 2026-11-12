import type { StaticTranslationString } from '@/types/types';

/**
 * The tiles of the Schnellzugriff on Home, by id. The router stores a choice of them per user,
 * the App Landing Page global the default; the dashboard gives each one its icon and link.
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
  'story',
  'challenges',
  'settings',
] as const;

export type QuickAccessTileId = (typeof QUICK_ACCESS_TILE_IDS)[number];

/** The name of each tile, on Home, in the user's settings and in the CMS. */
export const QUICK_ACCESS_TILE_LABELS: Record<QuickAccessTileId, StaticTranslationString> = {
  upload: { de: 'Bilder hochladen', en: 'Upload pictures', fr: 'Envoyer des photos' },
  qr: { de: 'Mein QR-Code', en: 'My QR code', fr: 'Mon code QR' },
  material: { de: 'Materialdepot', en: 'Material depot', fr: 'Dépôt de matériel' },
  wristbands: { de: 'Armbänder', en: 'Wristbands', fr: 'Bracelets' },
  support: { de: 'Hilfe & Support', en: 'Help & support', fr: 'Aide & support' },
  schedule: { de: 'Programm', en: 'Program', fr: 'Programme' },
  map: { de: 'Karte', en: 'Map', fr: 'Carte' },
  chat: { de: 'Chats', en: 'Chats', fr: 'Chats' },
  helperShifts: { de: 'Schichteinsätze', en: 'Helper shifts', fr: 'Services de helpers' },
  photoContest: { de: 'Foto-Wettbewerb', en: 'Photo contest', fr: 'Concours photo' },
  story: { de: 'Story', en: 'Story', fr: 'Histoire' },
  challenges: { de: 'Challenges', en: 'Challenges', fr: 'Défis' },
  settings: { de: 'Einstellungen', en: 'Settings', fr: 'Paramètres' },
};

/**
 * What Home shows until the user chooses otherwise, as long as the App Landing Page global names
 * no default of its own, see `defaultQuickAccessOf`.
 */
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

/**
 * The default tiles and their order as the CMS configures them. A global saved before the field
 * existed, or a dashboard configuration restored from the cache of an older release, has none,
 * and gets the built-in default.
 *
 * @param configured - the `defaultQuickAccessTiles` of the App Landing Page global
 */
export const defaultQuickAccessOf = (configured: unknown): readonly QuickAccessTileId[] => {
  const tiles = knownQuickAccessTiles(configured);
  return tiles === undefined || tiles.length === 0 ? DEFAULT_QUICK_ACCESS : tiles;
};

/**
 * Whether a choice is the default, tile for tile and in the same order.
 *
 * @param tiles - the choice
 * @param defaults - the default in force, see `defaultQuickAccessOf`
 */
export const isDefaultQuickAccess = (
  tiles: readonly QuickAccessTileId[],
  defaults: readonly QuickAccessTileId[],
): boolean =>
  tiles.length === defaults.length && tiles.every((id, index) => id === defaults[index]);
