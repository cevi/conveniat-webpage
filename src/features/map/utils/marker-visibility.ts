import type { CampMapAnnotationPoint } from '@/features/map/types/types';

/**
 * Zoom level from which the map is considered "zoomed in far enough" to label markers with their
 * title. Below it the pins alone are shown, which keeps the overview of the camp readable.
 */
export const MARKER_LABEL_MIN_ZOOM = 16;

/** Zoom levels from which markers of the given importance are shown. */
const MARKER_MIN_ZOOM: Record<CampMapAnnotationPoint['importance'], number> = {
  high: Number.NEGATIVE_INFINITY,
  medium: 14,
  low: 16,
};

/**
 * Whether a marker of the given importance is shown at this zoom level. Less important markers
 * only appear once the user has zoomed into the camp.
 */
export const isMarkerVisibleAtZoom = (
  importance: CampMapAnnotationPoint['importance'],
  zoom: number,
): boolean => zoom >= MARKER_MIN_ZOOM[importance];

/**
 * Whether the title of a marker is rendered next to its pin. Labels are opt-in per annotation
 * (`showLabel`) and only appear once the marker itself is visible and the map is zoomed in, so
 * that a zoomed-out camp map does not turn into a wall of text.
 */
export const isMarkerLabelVisibleAtZoom = (
  showLabel: boolean,
  importance: CampMapAnnotationPoint['importance'],
  zoom: number,
): boolean => showLabel && isMarkerVisibleAtZoom(importance, zoom) && zoom >= MARKER_LABEL_MIN_ZOOM;
