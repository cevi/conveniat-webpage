import type { StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ImageUp,
  LifeBuoy,
  MapIcon,
  MessageSquare,
  Package,
  QrCode,
  Settings,
  Trophy,
} from 'lucide-react';

/** Feature flags that decide whether a tile exists on this deployment. */
export interface QuickAccessFlags {
  imageUploadEnabled: boolean;
  /** the Materialdepot of this deployment, see `FEATURE_ENABLE_MATERIAL_MANAGEMENT` */
  materialEnabled: boolean;
  helperShiftsEnabled: boolean;
  photoContestEnabled: boolean;
}

/**
 * A tile the user can put into the Schnellzugriff. `href` undefined is the support tile, whose
 * mail link the component builds from the deployment's address.
 */
export interface QuickAccessTile {
  id: string;
  icon: LucideIcon;
  label: StaticTranslationString;
  href?: string;
  /** shown only to a signed-in user, the page behind it is of no use to a guest */
  needsAccount?: boolean;
  /** the feature flag the tile depends on */
  flag?: keyof QuickAccessFlags;
}

/** Every tile the Schnellzugriff offers, in the order they are offered. */
export const QUICK_ACCESS_TILES = [
  {
    id: 'upload',
    href: '/app/upload-images',
    icon: ImageUp,
    label: { de: 'Bilder hochladen', en: 'Upload pictures', fr: 'Envoyer des photos' },
    needsAccount: true,
    flag: 'imageUploadEnabled',
  },
  {
    id: 'qr',
    // the chat opens its QR sheet for this parameter
    href: '/app/chat?qr=mine',
    icon: QrCode,
    label: { de: 'Mein QR-Code', en: 'My QR code', fr: 'Mon code QR' },
    needsAccount: true,
  },
  {
    id: 'material',
    href: '/app/material',
    icon: Package,
    label: { de: 'Materialdepot', en: 'Material depot', fr: 'Dépôt de matériel' },
    needsAccount: true,
    flag: 'materialEnabled',
  },
  {
    id: 'support',
    icon: LifeBuoy,
    label: { de: 'Hilfe & Support', en: 'Help & support', fr: 'Aide & support' },
  },
  {
    id: 'schedule',
    href: '/app/schedule',
    icon: Calendar,
    label: { de: 'Programm', en: 'Program', fr: 'Programme' },
  },
  {
    id: 'map',
    href: '/app/map',
    icon: MapIcon,
    label: { de: 'Karte', en: 'Map', fr: 'Carte' },
  },
  {
    id: 'chat',
    href: '/app/chat',
    icon: MessageSquare,
    label: { de: 'Chats', en: 'Chats', fr: 'Chats' },
  },
  {
    id: 'helperShifts',
    href: '/app/helper-portal',
    icon: CalendarCheck2,
    label: { de: 'Schichteinsätze', en: 'Helper shifts', fr: 'Services de helpers' },
    flag: 'helperShiftsEnabled',
  },
  {
    id: 'photoContest',
    href: '/app/photo-contest',
    icon: Trophy,
    label: { de: 'Foto-Wettbewerb', en: 'Photo contest', fr: 'Concours photo' },
    flag: 'photoContestEnabled',
  },
  {
    id: 'settings',
    href: '/app/settings',
    icon: Settings,
    label: { de: 'Einstellungen', en: 'Settings', fr: 'Paramètres' },
  },
] as const satisfies readonly QuickAccessTile[];

export type QuickAccessTileId = (typeof QUICK_ACCESS_TILES)[number]['id'];

/** What Home shows until the user chooses otherwise. */
export const DEFAULT_QUICK_ACCESS: readonly QuickAccessTileId[] = [
  'upload',
  'qr',
  'material',
  'support',
];

const tileById = new Map<string, QuickAccessTile>(
  QUICK_ACCESS_TILES.map((tile) => [tile.id, tile]),
);

const isTileId = (value: unknown): value is QuickAccessTileId =>
  typeof value === 'string' && tileById.has(value);

/** The tile of an id, which `QuickAccessTileId` guarantees exists. */
export const tileOf = (id: QuickAccessTileId): QuickAccessTile =>
  tileById.get(id) as QuickAccessTile;

/**
 * The tiles the user has chosen, in their order, from what this phone stored. Nothing stored, or
 * nothing readable, is the default; an id a later release no longer offers is dropped.
 *
 * @param stored - the raw value from local storage
 */
export const parseChosenTiles = (stored: string | null): QuickAccessTileId[] => {
  if (stored === null) return [...DEFAULT_QUICK_ACCESS];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_QUICK_ACCESS];
    return [...new Set(parsed.filter((value) => isTileId(value)))];
  } catch {
    return [...DEFAULT_QUICK_ACCESS];
  }
};

/**
 * Whether a tile can be shown here: its feature is switched on and, if it needs one, the user
 * has an account.
 */
export const isTileAvailable = (
  tile: QuickAccessTile,
  context: { signedIn: boolean; flags: QuickAccessFlags },
): boolean =>
  (tile.needsAccount !== true || context.signedIn) &&
  (tile.flag === undefined || context.flags[tile.flag]);

/**
 * Adds a tile at the end of the chosen ones, or takes it out.
 *
 * @param chosen - the chosen tiles in their order
 * @param id - the tile to add or remove
 */
export const toggleTile = (
  chosen: readonly QuickAccessTileId[],
  id: QuickAccessTileId,
): QuickAccessTileId[] =>
  chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id];

/**
 * Moves a tile one place up or down among the tiles the user sees. A chosen tile that is hidden
 * here, like the Materialdepot of a guest, keeps its place and is stepped over, so it comes back
 * where it was once it is shown again.
 *
 * @param chosen - the chosen tiles in their order, hidden ones included
 * @param id - the tile to move
 * @param direction - -1 for up, 1 for down
 * @param visible - the tiles shown here
 */
export const moveTile = (
  chosen: readonly QuickAccessTileId[],
  id: QuickAccessTileId,
  direction: -1 | 1,
  visible: ReadonlySet<QuickAccessTileId>,
): QuickAccessTileId[] => {
  const from = chosen.indexOf(id);
  if (from === -1) return [...chosen];
  let to = from + direction;
  while (to >= 0 && to < chosen.length && !visible.has(chosen[to] as QuickAccessTileId)) {
    to += direction;
  }
  if (to < 0 || to >= chosen.length) return [...chosen];
  const next = [...chosen];
  next[from] = chosen[to] as QuickAccessTileId;
  next[to] = id;
  return next;
};
