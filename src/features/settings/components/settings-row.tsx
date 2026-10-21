import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface SettingsRowProperties {
  /** an icon tile before the title, for a row that stands for a place to go */
  icon?: LucideIcon | undefined;
  title: string;
  subtitle?: React.ReactNode | undefined;
  error?: string | undefined;
  action?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
  subtitleClassName?: string | undefined;
}

/**
 * A white card of settings rows. Its direct children are separated by a line, so a row wrapped
 * in a link or a tap handler still gets its divider.
 */
export const SettingsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'border-line overflow-hidden rounded-[14px] border bg-white',
      '[&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:right-0 [&>*+*]:before:left-4 [&>*+*]:before:h-px [&>*+*]:before:bg-green-100',
      className,
    )}
  >
    {children}
  </div>
);

/** One setting: what it is, its state below and its control on the right. */
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
      <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
        {icon !== undefined && <IconTile icon={icon} />}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-5 font-medium break-words text-green-900">{title}</p>
          {typeof error === 'string' && error.length > 0 ? (
            // in the warning colour and with a sign, so it is not read as the state of the setting
            <p className="text-danger-text mt-px flex items-start gap-1 text-[13px] leading-[18px] font-medium">
              <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : (
            subtitle !== undefined &&
            subtitle !== null &&
            subtitle !== false && (
              <p
                className={cn('mt-px text-[13px] leading-[18px] text-green-700', subtitleClassName)}
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
        <div className="px-4 pb-3">{children}</div>
      )}
    </div>
  );
};

/** A fact about the user: its name on the left, the value right-aligned. */
export const SettingsFactRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex min-h-[52px] items-center gap-4 px-4 py-2.5">
    <span className="shrink-0 text-[15px] font-medium text-green-900">{label}</span>
    <span className="min-w-0 flex-1 text-right text-[15px] break-words text-green-700">
      {value}
    </span>
  </div>
);
