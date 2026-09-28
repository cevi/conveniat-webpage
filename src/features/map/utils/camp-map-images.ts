import { getAnnotationIcon } from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

/**
 * The map images the camp map draws itself. They are painted on a canvas at runtime instead of
 * shipped as a sprite, so a marker in any CMS colour exists without a build step and nothing
 * extra has to be cached for offline use.
 */

/** Paper texture the camp style paints its background with, see `camp_style.json`. */
export const PAPER_IMAGE_ID = 'camp-paper';

/** Stretchable plate drawn behind the names of areas. */
export const LABEL_PLATE_IMAGE_ID = 'camp-label-plate';

/** Size of a marker badge in CSS pixels, by how prominent the marker is. */
export const BADGE_SIZE = { regular: 32, small: 21 } as const;

export type BadgeSize = keyof typeof BADGE_SIZE;

const PAPER_COLOR = '#f6efe0';
const PAPER_FIBRE_COLOR = '#b89b74';
const BADGE_RING_COLOR = '#fffdf6';
const STARRED_GLOW_COLOR = 'rgba(250, 204, 21, 0.9)';

const pixelRatio = (): number => Math.min(3, Math.max(1, Math.round(globalThis.devicePixelRatio)));

/** A small deterministic random generator, so the paper looks the same on every load. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return (): number => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
};

const createCanvas = (
  width: number,
  height: number,
  ratio: number,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('A 2d canvas context is not available');
  context.scale(ratio, ratio);
  return { canvas, context };
};

const imageData = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): ImageData =>
  context.getImageData(0, 0, canvas.width, canvas.height);

/**
 * Adds the paper texture: the background colour with faint fibres, tiled across the map.
 * @param map the map to add the image to
 */
export const addPaperImage = (map: MapLibreMap): void => {
  if (map.hasImage(PAPER_IMAGE_ID)) return;
  const size = 128;
  const ratio = pixelRatio();
  const { canvas, context } = createCanvas(size, size, ratio);
  const random = seededRandom(3);

  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, size, size);
  context.fillStyle = PAPER_FIBRE_COLOR;
  for (let index = 0; index < 260; index++) {
    context.globalAlpha = 0.05 + random() * 0.08;
    context.fillRect(random() * size, random() * size, 1 + random() * 1.5, 1 + random() * 1.5);
  }

  map.addImage(PAPER_IMAGE_ID, imageData(canvas, context), { pixelRatio: ratio });
};

/**
 * Adds the rounded plate area names sit on. It stretches with the text through `icon-text-fit`.
 * @param map the map to add the image to
 */
export const addLabelPlateImage = (map: MapLibreMap): void => {
  if (map.hasImage(LABEL_PLATE_IMAGE_ID)) return;
  const width = 32;
  const height = 24;
  const radius = 7;
  const ratio = pixelRatio();
  const { canvas, context } = createCanvas(width, height, ratio);

  context.beginPath();
  context.roundRect(1, 1, width - 2, height - 2, radius);
  context.fillStyle = 'rgba(255, 253, 248, 0.9)';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(74, 53, 38, 0.6)';
  context.stroke();

  const stretch = (from: number, to: number): [number, number] => [from * ratio, to * ratio];
  map.addImage(LABEL_PLATE_IMAGE_ID, imageData(canvas, context), {
    pixelRatio: ratio,
    stretchX: [stretch(radius, width - radius)],
    stretchY: [stretch(radius, height - radius)],
    content: [
      radius * 0.7 * ratio,
      radius * 0.5 * ratio,
      (width - radius * 0.7) * ratio,
      (height - radius * 0.5) * ratio,
    ],
  });
};

export interface BadgeImage {
  icon: CampMapAnnotation['icon'] | undefined;
  /** Hex colour, `#rrggbb`. */
  color: string;
  size: BadgeSize;
  isStarred: boolean;
}

/**
 * The image id of a marker badge, unique per look.
 * @param badge what the badge shows
 * @returns the image id
 */
export const getBadgeImageId = ({ icon, color, size, isStarred }: BadgeImage): string =>
  ['camp-badge', icon ?? 'none', color, size, isStarred ? 'starred' : 'plain'].join(':');

const loadSvg = (svg: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('The marker icon could not be drawn')));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

/**
 * Adds the round badge a marker is drawn with: its colour, a light ring, a soft shadow and its
 * icon in white. A starred marker gets a golden glow.
 * @param map the map to add the image to
 * @param badge what the badge shows
 */
export const addBadgeImage = async (map: MapLibreMap, badge: BadgeImage): Promise<void> => {
  const id = getBadgeImageId(badge);
  if (map.hasImage(id)) return;

  const Icon = getAnnotationIcon(badge.icon);
  const icon = await loadSvg(
    renderToString(createElement(Icon, { size: 24, color: '#ffffff', strokeWidth: 2.3 })),
  );
  // the badge may have been added while the icon was loading
  if (map.hasImage(id)) return;

  const diameter = BADGE_SIZE[badge.size];
  const padding = badge.isStarred ? 7 : 4;
  const size = diameter + padding * 2;
  const centre = size / 2;
  const radius = diameter / 2;
  const ringWidth = badge.size === 'small' ? 2 : 3.5;
  const ratio = pixelRatio();
  const { canvas, context } = createCanvas(size, size, ratio);

  context.shadowColor = badge.isStarred ? STARRED_GLOW_COLOR : 'rgba(0, 0, 0, 0.35)';
  context.shadowBlur = badge.isStarred ? 8 : 3;
  context.shadowOffsetY = badge.isStarred ? 0 : 1;
  context.beginPath();
  context.arc(centre, centre, radius, 0, Math.PI * 2);
  context.fillStyle = BADGE_RING_COLOR;
  context.fill();

  context.shadowColor = 'transparent';
  context.beginPath();
  context.arc(centre, centre, radius - ringWidth, 0, Math.PI * 2);
  context.fillStyle = badge.color;
  context.fill();

  const iconSize = diameter * 0.55;
  context.drawImage(icon, centre - iconSize / 2, centre - iconSize / 2, iconSize, iconSize);

  map.addImage(id, imageData(canvas, context), { pixelRatio: ratio });
};
