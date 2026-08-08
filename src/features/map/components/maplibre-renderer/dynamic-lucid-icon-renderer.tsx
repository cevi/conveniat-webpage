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
      className={cn(
        'flex flex-col items-center transition-transform duration-150',
        isSelected && 'origin-bottom scale-125',
      )}
      // a single drop shadow over the whole pin silhouette, rather than one per sub-shape
      style={{ filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))' }}
    >
      <div
        className={cn(
          'z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white',
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

      {/* Pin Tail (Triangle) */}
      <div className="z-0 -mt-1 flex flex-col items-center">
        {/* Outer Triangle (White border) */}
        <div
          className="h-0 w-0 border-t-12 border-r-10 border-l-10 border-r-transparent border-l-transparent"
          style={{ borderTopColor: 'white' }}
        />
        {/* Inner Triangle (Color) */}
        <div
          className="z-10 -mt-[11px] h-0 w-0 border-t-10 border-r-8 border-l-8 border-r-transparent border-l-transparent"
          style={{ borderTopColor: color }}
        />
      </div>
    </div>

    {/*
      The label is positioned absolutely so that it does not widen the marker element — the pin
      has to stay horizontally centered on its coordinate, no matter how long the title is.
      Long titles wrap onto a second line and are only then cut off with an ellipsis.
    */}
    {label !== undefined && label !== '' && (
      <span
        data-marker-label=""
        className="pointer-events-none absolute top-[18px] left-[calc(100%+6px)] line-clamp-2 max-w-40 -translate-y-1/2 text-[13px] leading-tight font-semibold text-balance"
        style={{
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
