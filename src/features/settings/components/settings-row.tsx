import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface SettingsRowProperties {
  icon: LucideIcon;
  title: string;
  subtitle?: string | undefined;
  error?: string | undefined;
  action?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
  subtitleClassName?: string | undefined;
}

export const SettingsRow: React.FC<SettingsRowProperties> = ({
  icon: Icon,
  title,
  subtitle,
  error,
  action,
  children,
  className,
  subtitleClassName,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{title}</p>
            {error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : (
              subtitle && (
                <p className={cn('truncate text-sm text-gray-500', subtitleClassName)}>
                  {subtitle}
                </p>
              )
            )}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
};
