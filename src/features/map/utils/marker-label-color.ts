/**
 * Perceived brightness a label colour may have at most. Above it the text washes out against the
 * light basemap even with a white outline, so the colour is darkened until it reaches this value.
 */
const MAX_LABEL_BRIGHTNESS = 150;

const HEX_COLOR_PATTERN = /^#?([\da-f]{6})$/i;

const toHexChannel = (channel: number): string =>
  Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0');

/**
 * Colour used for the title rendered next to a marker.
 *
 * The label picks up the colour of its marker — the same way map applications tint a POI name with
 * its category colour — but light colours (most notably yellow) are darkened so that the title
 * stays legible on the map.
 *
 * @param hexColor the marker colour, as `#rrggbb` or `rrggbb`
 * @returns the label colour as `#rrggbb`, or the input unchanged if it is not a hex colour
 */
export const getMarkerLabelColor = (hexColor: string): string => {
  const match = HEX_COLOR_PATTERN.exec(hexColor);
  if (match?.[1] === undefined) return hexColor;

  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;

  // weighted towards the channels the human eye is most sensitive to
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  if (brightness <= MAX_LABEL_BRIGHTNESS) return `#${match[1].toLowerCase()}`;

  const factor = MAX_LABEL_BRIGHTNESS / brightness;
  return `#${toHexChannel(red * factor)}${toHexChannel(green * factor)}${toHexChannel(blue * factor)}`;
};
