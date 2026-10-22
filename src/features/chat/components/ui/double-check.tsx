import { cn } from '@/utils/tailwindcss-override';
import { Check } from 'lucide-react';
import type React from 'react';

/**
 * Two checks of the single tick's size, the second overlapping the first: a message delivered,
 * or read in a colour of its own.
 */
export const DoubleCheck: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('relative flex h-3.5 w-5 items-center', className)}>
    <Check className="absolute left-0 h-3.5 w-3.5" strokeWidth={2.5} />
    <Check className="absolute left-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
  </span>
);
