import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const rowClassName =
  'focus-visible:focus-ring-inset flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 text-left text-[15px] font-medium';

/**
 * One action in a sheet of actions on a chat, a message or a member: an icon and what it does,
 * as a row that lights up under the pointer. A destructive one, like leaving or removing, is
 * red. The rows of a sheet sit in a list pulled out by `-mx-3`, so their text lines up with the
 * sheet's title.
 */
export const SheetActionRow: React.FC<{
  icon: LucideIcon;
  label: string;
  /** a row that leads somewhere is a link */
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  /** announces a label that changes after the tap, like "Kopiert" */
  liveLabel?: boolean;
  /** a row that cannot be used right now, e.g. offline; `hint` says why */
  disabled?: boolean;
  /** a second line under the label, e.g. why the row is disabled */
  hint?: string | undefined;
}> = ({
  icon: Icon,
  label,
  href,
  onClick,
  destructive = false,
  liveLabel = false,
  disabled = false,
  hint,
}) => {
  const className = cn(
    rowClassName,
    destructive ? 'text-danger-text hover:bg-danger-soft' : 'hover:bg-quiet text-green-900',
    hint !== undefined && 'py-2',
    disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
  );
  const body = (
    <>
      <Icon
        className={cn('h-5 w-5 shrink-0', !destructive && 'text-green-700')}
        aria-hidden="true"
      />
      {hint === undefined ? (
        <span aria-live={liveLabel ? 'polite' : undefined}>{label}</span>
      ) : (
        <span className="flex flex-col">
          <span aria-live={liveLabel ? 'polite' : undefined}>{label}</span>
          <span className="text-[13px] font-normal text-green-700">{hint}</span>
        </span>
      )}
    </>
  );
  return (
    <li>
      {href === undefined ? (
        <button type="button" onClick={onClick} disabled={disabled} className={className}>
          {body}
        </button>
      ) : (
        <Link href={href} className={className} {...(onClick === undefined ? {} : { onClick })}>
          {body}
        </Link>
      )}
    </li>
  );
};
