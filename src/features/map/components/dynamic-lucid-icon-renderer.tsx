import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { LucideProps } from 'lucide-react';
import {
  BriefcaseMedical,
  Flag,
  GlassWater,
  HelpCircle,
  MapPin,
  Recycle,
  Tent,
  Utensils,
} from 'lucide-react';
import type React from 'react';

const CirclePin: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div className="relative h-12 w-9">
    <div
      className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white p-1"
      style={{ backgroundColor: color }}
    >
      {children}
    </div>

    {/* This is your small dot. Its center needs to be on the coordinate. */}
    <div
      className="absolute bottom-[-2px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-white"
      style={{ backgroundColor: color }}
    />
  </div>
);

export const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
}> = ({ icon, color = '#78909c' }): React.JSX.Element => {
  const iconMap: Record<string, React.ElementType<LucideProps>> = {
    MapPin: MapPin,
    Tent: Tent,
    Utensils: Utensils,
    Flag: Flag,
    HelpCircle: HelpCircle,
    Recycle: Recycle,
    GlassWater: GlassWater,
    BriefcaseMedical: BriefcaseMedical,
  };

  const IconComponent: React.ElementType<LucideProps> =
    icon !== undefined && icon !== null ? (iconMap[icon] ?? MapPin) : MapPin;

  // Fallback if the icon is not recognized
  return (
    <CirclePin color={color}>
      <IconComponent size={24} className="text-white" />
    </CirclePin>
  );
};
