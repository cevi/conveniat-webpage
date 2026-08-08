import { getMarkerLabelColor } from '@/features/map/utils/marker-label-color';
import type { MarkerLabelPlacement } from '@/features/map/utils/marker-stacking';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { formatHexColor } from '@/utils/format-hex-color';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideProps } from 'lucide-react';
import {
  BriefcaseMedical,
  Flag,
  GlassWater,
  HelpCircle,
  MapPin,
  Recycle,
  Tent,
  Theater,
  Toilet,
  Utensils,
} from 'lucide-react';
import type React from 'react';

/**
 * Selector for the label element inside a marker, used by the zoom listener to toggle its
 * visibility without re-rendering the whole marker.
 */
export const MARKER_LABEL_SELECTOR = '[data-marker-label]';

/** Selector for the tail of a marker, used to aim it at the marker's real coordinate. */
export const MARKER_TAIL_SELECTOR = '[data-marker-tail]';

/**
 * Turns the tail of an already rendered marker by the given angle (in degrees, clockwise from
 * straight down). Markers fanned out from a shared coordinate use this to keep pointing at the
 * position they actually belong to.
 */
export const applyMarkerTailAngle = (tailElement: HTMLElement, degrees: number): void => {
  tailElement.style.transform = degrees === 0 ? '' : `rotate(${degrees}deg)`;
};

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
 * Where the label sits relative to its pin, for each placement. The circle of the pin is 36px
 * high, so `18px` from the top of the marker is its vertical centre.
 */
const MARKER_LABEL_PLACEMENT_STYLES: Record<MarkerLabelPlacement, React.CSSProperties> = {
  right: {
    left: 'calc(100% + 6px)',
    right: 'auto',
    top: '18px',
    bottom: 'auto',
    transform: 'translateY(-50%)',
    textAlign: 'left',
  },
  left: {
    left: 'auto',
    right: 'calc(100% + 6px)',
    top: '18px',
    bottom: 'auto',
    transform: 'translateY(-50%)',
    textAlign: 'right',
  },
  top: {
    left: '50%',
    right: 'auto',
    top: 'auto',
    bottom: 'calc(100% + 4px)',
    transform: 'translateX(-50%)',
    textAlign: 'center',
  },
};

/**
 * Moves an already rendered label to the given side of its pin. The placement depends on how many
 * markers share a coordinate, which is only known once the visible markers are known — hence it is
 * applied to the DOM rather than passed as a prop.
 */
export const applyMarkerLabelPlacement = (
  labelElement: HTMLElement,
  placement: MarkerLabelPlacement,
): void => {
  Object.assign(labelElement.style, MARKER_LABEL_PLACEMENT_STYLES[placement]);
};

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
}: CirclePinProperties): React.JSX.Element => (
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
          backgroundColor: color,
          ...(isStarred && {
            boxShadow: '0 0 10px 4px rgba(250, 204, 21, 0.7)',
          }),
        }}
      >
        {children}
      </div>

      {/*
        Pin tail (triangle). It spans the circle so that it rotates around the circle's centre:
        a marker that had to be moved off its coordinate points its tail back at it, see
        `applyMarkerTailAngle`.
      */}
      <div
        data-marker-tail=""
        className="absolute inset-x-0 top-0 z-0 h-9"
        style={{ transformOrigin: 'center' }}
      >
        <div className="absolute top-[calc(100%-4px)] left-1/2 flex -translate-x-1/2 flex-col items-center">
          {/* Outer Triangle (White border) */}
          <div
            className="h-0 w-0 border-t-12 border-r-10 border-l-10 border-r-transparent border-l-transparent"
            style={{ borderTopColor: 'white' }}
          />
          {/* Inner Triangle (Color) */}
          <div
            className="-mt-[11px] h-0 w-0 border-t-10 border-r-8 border-l-8 border-r-transparent border-l-transparent"
            style={{ borderTopColor: color }}
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

      Which side it ends up on is set on the DOM afterwards, see `applyMarkerLabelPlacement`.
    */}
    {label !== undefined && label !== '' && (
      <span
        data-marker-label=""
        className="pointer-events-none absolute line-clamp-2 w-max max-w-40 text-[13px] leading-tight font-semibold text-balance"
        style={{
          ...MARKER_LABEL_PLACEMENT_STYLES.right,
          // the title picks up the colour of its marker, darkened where needed to stay legible
          color: getMarkerLabelColor(color),
          textShadow: LABEL_OUTLINE_TEXT_SHADOW,
        }}
      >
        {label}
      </span>
    )}
  </div>
);

export const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
  isStarred?: boolean;
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
  const iconMap: Record<string, React.ElementType<LucideProps>> = {
    MapPin: MapPin,
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

  const IconComponent: React.ElementType<LucideProps> =
    icon !== undefined && icon !== null ? (iconMap[icon] ?? MapPin) : MapPin;

  // Fallback if the icon is not recognized
  return (
    <CirclePin color={hexColor} isStarred={isStarred} isSelected={isSelected} label={label}>
      <IconComponent size={24} className="text-white" />
    </CirclePin>
  );
};
