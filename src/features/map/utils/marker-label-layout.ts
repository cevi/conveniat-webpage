import type { MarkerLabelPlacement } from '@/features/map/utils/marker-stacking';

/** Width of a marker pin, in CSS pixels. */
export const MARKER_ICON_WIDTH = 36;

/** Height of a marker pin including its tail, in CSS pixels. */
export const MARKER_ICON_HEIGHT = 44;

/** Distance kept between a pin and the title beside it, in CSS pixels. */
const LABEL_SIDE_GAP = 6;

/** Distance kept between a pin and the title above it, in CSS pixels. */
const LABEL_TOP_GAP = 4;

/** Placements tried for a title, in the order they are preferred when the favourite is taken. */
const FALLBACK_PLACEMENTS: MarkerLabelPlacement[] = ['right', 'left', 'top'];

/** A point on the map canvas, in CSS pixels relative to its top-left corner. */
export interface CanvasPoint {
  x: number;
  y: number;
}

/** An axis aligned rectangle on the map canvas, in CSS pixels. */
export interface LayoutRectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A marker taking part in the label layout. */
export interface LabelLayoutCandidate {
  id: string;
  /** Position of the tip of the pin on the canvas, i.e. the marker's anchor. */
  anchor: CanvasPoint;
  /** Placement the marker would like, see `getMarkerLabelPlacement`. */
  preferredPlacement: MarkerLabelPlacement;
  /** Rendered size of the title, or `undefined` for a marker without a visible title. */
  labelSize?: { width: number; height: number } | undefined;
}

/** Whether two rectangles share any area. Touching edges do not count as an overlap. */
export const rectanglesOverlap = (a: LayoutRectangle, b: LayoutRectangle): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Area covered by the pin of a marker. Markers are anchored at the tip of their tail, so the icon
 * extends upwards from the anchor.
 */
export const getMarkerIconRectangle = (anchor: CanvasPoint): LayoutRectangle => ({
  left: anchor.x - MARKER_ICON_WIDTH / 2,
  right: anchor.x + MARKER_ICON_WIDTH / 2,
  top: anchor.y - MARKER_ICON_HEIGHT,
  bottom: anchor.y,
});

/**
 * Area a title would cover if it were rendered on the given side of its pin.
 *
 * @param anchor position of the tip of the pin on the canvas
 * @param placement side the title is rendered on
 * @param labelSize rendered size of the title
 */
export const getLabelRectangle = (
  anchor: CanvasPoint,
  placement: MarkerLabelPlacement,
  labelSize: { width: number; height: number },
): LayoutRectangle => {
  const circleCenterY = anchor.y - MARKER_ICON_HEIGHT + MARKER_ICON_WIDTH / 2;

  if (placement === 'top') {
    const bottom = anchor.y - MARKER_ICON_HEIGHT - LABEL_TOP_GAP;
    return {
      left: anchor.x - labelSize.width / 2,
      right: anchor.x + labelSize.width / 2,
      top: bottom - labelSize.height,
      bottom,
    };
  }

  const top = circleCenterY - labelSize.height / 2;
  if (placement === 'left') {
    const right = anchor.x - MARKER_ICON_WIDTH / 2 - LABEL_SIDE_GAP;
    return { left: right - labelSize.width, right, top, bottom: top + labelSize.height };
  }

  const left = anchor.x + MARKER_ICON_WIDTH / 2 + LABEL_SIDE_GAP;
  return { left, right: left + labelSize.width, top, bottom: top + labelSize.height };
};

/**
 * Picks the side each title is rendered on so that titles run into neither the pins of
 * neighbouring markers nor titles that have already been placed.
 *
 * Candidates are handled in the order they are given, so callers should pass the markers whose
 * title matters most first. A marker keeps its preferred side whenever that side is free, and
 * falls back to it when no side is.
 *
 * @param candidates the visible markers, most important first
 * @returns the chosen placement per marker id, only for markers with a visible title
 */
export const chooseLabelPlacements = (
  candidates: LabelLayoutCandidate[],
): Map<string, MarkerLabelPlacement> => {
  const iconRectangles = candidates.map((candidate) => ({
    id: candidate.id,
    rectangle: getMarkerIconRectangle(candidate.anchor),
  }));

  const placedLabels: LayoutRectangle[] = [];
  const placements = new Map<string, MarkerLabelPlacement>();

  for (const candidate of candidates) {
    const { labelSize } = candidate;
    if (labelSize === undefined) continue;

    const options = [
      candidate.preferredPlacement,
      ...FALLBACK_PLACEMENTS.filter((placement) => placement !== candidate.preferredPlacement),
    ];

    const free = options.find((placement) => {
      const rectangle = getLabelRectangle(candidate.anchor, placement, labelSize);
      const hitsIcon = iconRectangles.some(
        (icon) => icon.id !== candidate.id && rectanglesOverlap(rectangle, icon.rectangle),
      );
      if (hitsIcon) return false;
      return !placedLabels.some((placed) => rectanglesOverlap(rectangle, placed));
    });

    const chosen = free ?? candidate.preferredPlacement;
    placements.set(candidate.id, chosen);
    placedLabels.push(getLabelRectangle(candidate.anchor, chosen, labelSize));
  }

  return placements;
};
