import type { QuickAccessTileId } from '@/features/settings/quick-access';
import type { StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ImageUp,
  LifeBuoy,
  MapIcon,
  MessageSquare,
  Nfc,
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
  /** the NFC wristbands of this deployment, see `FEATURE_ENABLE_NFC_WRISTBANDS`, and the user's
   * access to them */
  wristbandsEnabled: boolean;
}

/**
 * A tile the user can put into the Schnellzugriff. The support tile has no `href`: the component
 * builds its mail link from the deployment's address.
 */
export interface QuickAccessTile {
  id: QuickAccessTileId;
  icon: LucideIcon;
  label: StaticTranslationString;
  href?: string;
  /** shown only to a signed-in user, the page behind it is of no use to a guest */
  needsAccount?: boolean;
  /** the feature flag the tile depends on */
  flag?: keyof QuickAccessFlags;
}

/** Every tile the Schnellzugriff offers, in the order they are offered, one per id. */
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
    id: 'wristbands',
    href: '/app/wristbands',
    icon: Nfc,
    label: { de: 'Armbänder', en: 'Wristbands', fr: 'Bracelets' },
    needsAccount: true,
    flag: 'wristbandsEnabled',
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

const tileById = new Map<string, QuickAccessTile>(
  QUICK_ACCESS_TILES.map((tile) => [tile.id, tile]),
);

/** The tile of an id, which `QuickAccessTileId` guarantees exists. */
export const tileOf = (id: QuickAccessTileId): QuickAccessTile =>
  tileById.get(id) as QuickAccessTile;

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
 * Moves a tile one place up or down among the tiles the user sees: past its next visible
 * neighbour. A chosen tile hidden here, like the Materialdepot of a guest, is stepped over and
 * every other tile keeps its order, so the hidden one comes back where it was once it is shown.
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
  let neighbourIndex = from + direction;
  while (
    neighbourIndex >= 0 &&
    neighbourIndex < chosen.length &&
    !visible.has(chosen[neighbourIndex] as QuickAccessTileId)
  ) {
    neighbourIndex += direction;
  }
  const neighbour = chosen[neighbourIndex];
  if (neighbour === undefined) return [...chosen];
  const rest = chosen.filter((other) => other !== id);
  rest.splice(rest.indexOf(neighbour) + (direction === 1 ? 1 : 0), 0, id);
  return rest;
};
