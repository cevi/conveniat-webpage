import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/** An icon on a soft brand-green square, at the start of a fact, a row or an empty state. */
export const IconTile: React.FC<{
  icon: LucideIcon;
  size?: 'md' | 'lg';
  className?: string;
}> = ({ icon: Icon, size = 'md', className }) => (
  <span
    className={cn(
      'text-conveniat-green bg-tint flex shrink-0 items-center justify-center',
      size === 'md' ? 'h-[38px] w-[38px] rounded-[10px]' : 'h-14 w-14 rounded-2xl',
      className,
    )}
  >
    <Icon className={size === 'md' ? 'h-5 w-5' : 'h-7 w-7'} aria-hidden="true" />
  </span>
);
