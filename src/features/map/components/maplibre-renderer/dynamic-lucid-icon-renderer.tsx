import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
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

interface CirclePinProperties {
  color: string;
  children: React.ReactNode;
  isStarred?: boolean;
}

const CirclePin = ({
  color,
  children,
  isStarred = false,
}: CirclePinProperties): React.JSX.Element => (
  <div className="flex flex-col items-center" style={{ width: 'fit-content' }}>
    <div
      className={cn(
        'z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg',
        isStarred && 'animate-star-glow-pulse',
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
      {/* Precision Tip / Shadow */}
      <div className="z-20 -mt-0.5 h-1 w-1 rounded-full bg-black/20 blur-[0.5px]" />
    </div>
  </div>
);

export const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
  isStarred?: boolean;
}> = ({ icon, color = '78909c', isStarred = false }): React.JSX.Element => {
  const hexColor = color.startsWith('#') ? color : `#${color}`;
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
    <CirclePin color={hexColor} isStarred={isStarred}>
      <IconComponent size={24} className="text-white" />
    </CirclePin>
  );
};
