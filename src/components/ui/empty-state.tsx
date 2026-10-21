import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * What a page shows while it has nothing to show: what is missing, why, and the way forward
 * when there is one.
 */
export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div
    className={cn(
      'border-line flex flex-col items-center rounded-[14px] border bg-white px-6 py-8 text-center',
      className,
    )}
  >
    <IconTile icon={icon} size="lg" />
    <h2 className="font-heading text-heading mt-4 text-lg font-bold">{title}</h2>
    {description !== undefined && (
      <div className="mt-1.5 max-w-xs text-[15px] leading-normal text-green-700">{description}</div>
    )}
    {action !== undefined && <div className="mt-5">{action}</div>}
  </div>
);
