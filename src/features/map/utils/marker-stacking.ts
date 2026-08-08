/** Side of its pin a marker title is rendered on. */
export type MarkerLabelPlacement = 'left' | 'right' | 'top';

/** Distance (in CSS pixels) kept between neighbouring markers of a fan. */
const FAN_MARKER_SPACING = 40;

/** Angle (in degrees) between neighbouring markers of a fan, before it has to close into a ring. */
const FAN_ANGLE_STEP = 72;

/** Widest angle (in degrees) a fan may span, so that it never closes completely. */
const MAX_FAN_ANGLE = 300;

/** Beyond this angle from straight up the label is put beside the pin rather than above it. */
const SIDEWAYS_LABEL_ANGLE = 20;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Key identifying the position of a marker. Coordinates are rounded to about 10cm, which is far
 * below what is distinguishable on the camp map — markers that agree to that precision would be
 * drawn on top of each other and have to be spread apart.
 */
export const getCoordinateKey = (coordinates: [number, number]): string =>
  `${coordinates[0].toFixed(6)},${coordinates[1].toFixed(6)}`;

/**
 * Angle of the n-th marker of a fan, in degrees, measured from straight up and growing clockwise;
 * `0` for a marker that shares its coordinate with no other. The fan is centred on the vertical,
 * spans wider the more markers it holds, and starts closing into a ring once it has reached
 * {@link MAX_FAN_ANGLE}.
 */
const getFanAngle = (stackIndex: number, groupSize: number): number => {
  if (groupSize <= 1) return 0;
  const step = Math.min(FAN_ANGLE_STEP, MAX_FAN_ANGLE / (groupSize - 1));
  return step * (stackIndex - (groupSize - 1) / 2);
};

/**
 * Pixel offset for the n-th marker sharing a coordinate.
 *
 * Markers that would sit exactly on top of each other are fanned out around their shared
 * coordinate instead of being stacked in a column, which keeps every icon and every title
 * visible. The radius grows with the number of markers so that neighbours stay
 * {@link FAN_MARKER_SPACING} apart however many there are.
 *
 * @param stackIndex position within the group, `0` for the first marker
 * @param groupSize number of markers sharing the coordinate
 * @returns the offset as `[x, y]` in CSS pixels, `[0, 0]` for a marker that shares its coordinate
 *   with no other
 */
export const getCoincidentMarkerOffset = (
  stackIndex: number,
  groupSize: number,
): [number, number] => {
  if (groupSize <= 1) return [0, 0];

  const step = Math.min(FAN_ANGLE_STEP, MAX_FAN_ANGLE / (groupSize - 1));
  const radius = FAN_MARKER_SPACING / (2 * Math.sin(toRadians(step) / 2));
  const angle = toRadians(getFanAngle(stackIndex, groupSize));

  // negative y is up, so the fan opens above the shared coordinate
  return [Math.round(radius * Math.sin(angle)), -Math.round(radius * Math.cos(angle))];
};

/**
 * Distance (in CSS pixels) between the tip of a pin's tail and the centre of its circle, which is
 * what the tail rotates around.
 */
const TAIL_TIP_TO_CIRCLE_CENTER = 26;

/**
 * Angle (in degrees, clockwise from straight down) the tail of a marker has to be turned by so
 * that it points back at the coordinate the marker belongs to.
 *
 * @param offset how far the marker was moved off its coordinate, see
 *   {@link getCoincidentMarkerOffset}
 */
export const getMarkerTailAngle = ([offsetX, offsetY]: [number, number]): number => {
  if (offsetX === 0 && offsetY === 0) return 0;
  return (Math.atan2(offsetX, TAIL_TIP_TO_CIRCLE_CENTER - offsetY) * 180) / Math.PI;
};

/**
 * Side the title of the n-th marker of a fan is rendered on: markers leaning left are labelled to
 * their left, markers leaning right to their right, and one sitting straight above the coordinate
 * gets its title on top. That way the titles fan out with the pins instead of all running into
 * each other on the right.
 *
 * @param stackIndex position within the group, `0` for the first marker
 * @param groupSize number of markers sharing the coordinate
 */
export const getMarkerLabelPlacement = (
  stackIndex: number,
  groupSize: number,
): MarkerLabelPlacement => {
  if (groupSize <= 1) return 'right';

  const angle = getFanAngle(stackIndex, groupSize);
  if (angle <= -SIDEWAYS_LABEL_ANGLE) return 'left';
  if (angle >= SIDEWAYS_LABEL_ANGLE) return 'right';
  return 'top';
};
