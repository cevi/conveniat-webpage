import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface SettingsRowProperties {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode | undefined;
  error?: string | undefined;
  action?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
  subtitleClassName?: string | undefined;
}

/**
 * A white card of settings rows. Its direct children are separated by a line that starts where
 * the text of a row starts, as in the facts card of a Programmpunkt, so a row wrapped in a link
 * or a tap handler still gets its divider.
 */
export const SettingsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'border-line overflow-hidden rounded-[14px] border bg-white',
      '[&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:right-0 [&>*+*]:before:left-16 [&>*+*]:before:h-px [&>*+*]:before:bg-green-100',
      className,
    )}
  >
    {children}
  </div>
);

/** One setting: an icon on a soft tile, what it is, its state below and its control on the right. */
export const SettingsRow: React.FC<SettingsRowProperties> = ({
  icon,
  title,
  subtitle,
  error,
  action,
  children,
  className,
  subtitleClassName,
}) => {
  return (
    <div className={className}>
      <div className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-5 font-semibold text-green-900">{title}</p>
          {typeof error === 'string' && error.length > 0 ? (
            <p className="mt-px text-[13px] leading-[18px] font-medium text-green-900">{error}</p>
          ) : (
            subtitle !== undefined &&
            subtitle !== null &&
            subtitle !== false && (
              <p
                className={cn(
                  'mt-px truncate text-[13px] leading-[18px] text-green-700',
                  subtitleClassName,
                )}
              >
                {subtitle}
              </p>
            )
          )}
        </div>
        {action !== undefined && action !== null && action !== false && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      {children !== undefined && children !== null && children !== false && (
        <div className="px-3.5 pb-3">{children}</div>
      )}
    </div>
  );
};
