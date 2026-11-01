import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** The small uppercase heading over a section of an app page: "MITNEHMEN", "WEITERE ZEITFENSTER". */
export const SectionLabel: React.FC<{
  children: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}> = ({ children, as: Tag = 'h2', className }) => (
  <Tag className={cn('text-xs font-bold tracking-[0.08em] text-green-700 uppercase', className)}>
    {children}
  </Tag>
);
