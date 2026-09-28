import { getMarkerLabelColor } from '@/features/map/utils/marker-label-color';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { formatHexColor } from '@/utils/format-hex-color';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideProps } from 'lucide-react';
import {
  BriefcaseMedical,
  Flag,
  GlassWater,
  HelpCircle,
  Recycle,
  Tent,
  Theater,
  Toilet,
  Utensils,
} from 'lucide-react';
import type React from 'react';

/**
 * Solid white outline around the label, drawn as eight offset shadows plus a soft one. A blurred
 * halo alone disappears against the light basemap; the offsets keep the title readable wherever
 * it happens to sit.
 */
const LABEL_OUTLINE_TEXT_SHADOW = [
  '-1px -1px 0 #fff',
  '1px -1px 0 #fff',
  '-1px 1px 0 #fff',
  '1px 1px 0 #fff',
  '0 -1.5px 0 #fff',
  '0 1.5px 0 #fff',
  '-1.5px 0 0 #fff',
  '1.5px 0 0 #fff',
  '0 1px 3px rgba(255, 255, 255, 0.95)',
].join(', ');

/**
 * Where the label sits relative to its pin: to its right, vertically centred on the circle. The
 * circle of the pin is 36px high, so `18px` from the top of the marker is its vertical centre.
 */
const MARKER_LABEL_POSITION_STYLE: React.CSSProperties = {
  left: 'calc(100% + 6px)',
  top: '18px',
  transform: 'translateY(-50%)',
  textAlign: 'left',
};

/**
 * The colour a selected marker takes on, whatever colour it carries otherwise.
 *
 * Selection used to be a white ring and a slightly larger pin - which is legible next to the
 * same marker a moment earlier, and invisible on a map full of other pins, where nobody has the
 * "before" to compare against. A colour no annotation uses answers "which one is it" at a
 * glance, the way a dropped pin does on any other map.
 */
export const SELECTED_MARKER_COLOR = '#dc2626';

/**
 * What an annotation shows when it names no icon, or names one this renderer does not know.
 *
 * Deliberately not the pin: the pin marks the annotation somebody is looking at, and a fallback
 * that reached for it would put that symbol on the map for annotations nobody selected.
 */
const UNSPECIFIED_ICON = Flag;

const ANNOTATION_ICONS: Record<string, React.ElementType<LucideProps>> = {
  Tent: Tent,
  Utensils: Utensils,
  Flag: Flag,
  HelpCircle: HelpCircle,
  Recycle: Recycle,
  GlassWater: GlassWater,
  Toilet: Toilet,
  Stage: Theater,
  BriefcaseMedical: BriefcaseMedical,
};

/**
 * The lucide icon an annotation is drawn with, falling back to a flag for a missing or unknown one.
 * @param icon the icon name stored on the annotation
 * @returns the icon component
 */
export const getAnnotationIcon = (
  icon: CampMapAnnotation['icon'] | undefined,
): React.ElementType<LucideProps> =>
  icon === undefined || icon === null
    ? UNSPECIFIED_ICON
    : (ANNOTATION_ICONS[icon] ?? UNSPECIFIED_ICON);

/**
 * The selected annotation, drawn as a dropped pin.
 *
 * Not the circular pin the other annotations use: a red circle among coloured circles is still a
 * circle, and told apart only by somebody who noticed the colour. The teardrop is a different
 * shape at a glance, and it is the shape every map uses for "the place you asked about", so it
 * needs no learning.
 *
 * The tip is the bottom of the drawing, which is where the marker is anchored, so the pin points
 * at its coordinate without the tail the circular pin needs.
 */
const LocationPin = ({
  color,
  label,
}: {
  color: string;
  label?: string | undefined;
}): React.JSX.Element => (
  <div className="relative flex w-fit flex-col items-center">
    <svg
      width="30"
      height="40"
      viewBox="0 0 24 32"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))' }}
    >
      <path
        d="M12 0C5.373 0 0 5.373 0 12c0 8.4 10.5 18.7 11.4 19.6a.85.85 0 0 0 1.2 0C13.5 30.7 24 20.4 24 12 24 5.373 18.627 0 12 0Z"
        fill={color}
      />
      {/* the darker hole, which is what keeps the pin from reading as a solid blob */}
      <circle cx="12" cy="11.5" r="4.2" fill="rgb(0 0 0 / 0.28)" />
    </svg>

    {label !== undefined && label !== '' && (
      <span
        className="pointer-events-none absolute line-clamp-2 w-max max-w-40 text-[13px] leading-tight font-semibold text-balance"
        style={{
          ...MARKER_LABEL_POSITION_STYLE,
          color: getMarkerLabelColor(color),
          textShadow: LABEL_OUTLINE_TEXT_SHADOW,
        }}
      >
        {label}
      </span>
    )}
  </div>
);

interface CirclePinProperties {
  color: string;
  children: React.ReactNode;
  isStarred?: boolean;
  isSelected?: boolean;
  /** Title rendered next to the pin; omitted or empty renders no label. */
  label?: string | undefined;
}

const CirclePin = ({
  color,
  children,
  isStarred = false,
  isSelected = false,
  label,
}: CirclePinProperties): React.JSX.Element => {
  // every part of the pin has to move together - a red circle over a purple tail is not a pin
  const pinColor = isSelected ? SELECTED_MARKER_COLOR : color;

  return (
    <div className="relative flex w-fit flex-col items-center">
      <div
        className={cn('relative transition-transform duration-150', isSelected && 'scale-125')}
        // a single drop shadow over the whole pin silhouette, rather than one per sub-shape
        style={{ filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))', transformOrigin: 'bottom' }}
      >
        <div
          className={cn(
            'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white',
            isStarred && 'animate-star-glow-pulse',
            isSelected && 'ring-2 ring-white/70',
          )}
          style={{
            backgroundColor: pinColor,
            ...(isStarred && {
              boxShadow: '0 0 10px 4px rgba(250, 204, 21, 0.7)',
            }),
          }}
        >
          {children}
        </div>

        {/* Pin tail (triangle) */}
        <div className="absolute inset-x-0 top-0 z-0 h-9">
          <div className="absolute top-[calc(100%-4px)] left-1/2 flex -translate-x-1/2 flex-col items-center">
            {/* Outer Triangle (White border) */}
            <div
              className="h-0 w-0 border-t-12 border-r-10 border-l-10 border-r-transparent border-l-transparent"
              style={{ borderTopColor: 'white' }}
            />
            {/* Inner Triangle (Color) */}
            <div
              className="-mt-[11px] h-0 w-0 border-t-10 border-r-8 border-l-8 border-r-transparent border-l-transparent"
              style={{ borderTopColor: pinColor }}
            />
          </div>
        </div>

        {/* keeps the marker as tall as circle plus tail, so the tip sits on the marker's anchor */}
        <div className="h-2" />
      </div>

      {/*
      The label is positioned absolutely so that it does not widen the marker element — the pin
      has to stay horizontally centered on its coordinate, no matter how long the title is.
      Because of that its width would otherwise shrink to the longest word — which breaks even
      short titles across several lines — hence the explicit `max-content` width: titles keep to
      one line until they hit the maximum width, then wrap once and are cut off with an ellipsis.

    */}
      {label !== undefined && label !== '' && (
        <span
          className="pointer-events-none absolute line-clamp-2 w-max max-w-40 text-[13px] leading-tight font-semibold text-balance"
          style={{
            ...MARKER_LABEL_POSITION_STYLE,
            // the title picks up the colour of its marker, darkened where needed to stay legible
            color: getMarkerLabelColor(pinColor),
            textShadow: LABEL_OUTLINE_TEXT_SHADOW,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
  isStarred?: boolean;
  /** Paints the pin in {@link SELECTED_MARKER_COLOR} and gives it a location-pin glyph. */
  isSelected?: boolean;
  label?: string | undefined;
}> = ({
  icon,
  color = '78909c',
  isStarred = false,
  isSelected = false,
  label,
}): React.JSX.Element => {
  const hexColor = formatHexColor(color) as string;

  /*
   * A selected marker shows a pin rather than what it is.
   *
   * Recoloured or not, a briefcase reads as "first aid" and a tent as "a tent" - neither says
   * "this is the one you are looking for". The pin glyph is the only symbol that means that, and
   * it is the same thing every other map does with a dropped pin. What the annotation is stays
   * on screen anyway: its label sits next to the marker and its drawer is open below it.
   */
  const categoryIcon =
    (icon === undefined || icon === null ? undefined : ANNOTATION_ICONS[icon]) ?? UNSPECIFIED_ICON;

  // What the annotation is stays readable from its label and its open drawer; while it is
  // selected the marker's job is to say where, not what.
  if (isSelected) return <LocationPin color={SELECTED_MARKER_COLOR} label={label} />;

  const CategoryIcon = categoryIcon;
  return (
    <CirclePin color={hexColor} isStarred={isStarred} label={label}>
      <CategoryIcon size={24} className="text-white" />
    </CirclePin>
  );
};
