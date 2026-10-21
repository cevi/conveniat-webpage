import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const NavLink: React.FC<{
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  /** the tab of the page that is shown, not merely the one being loaded */
  isCurrent: boolean;
  color: string | undefined;
  onClick: (href: string) => void;
  isLoading: boolean;
  loadingHref: string | undefined;
}> = ({ href, icon: Icon, label, isActive, isCurrent, color, onClick, isLoading, loadingHref }) => {
  const isCurrentlyLoading = isLoading && loadingHref === href;
  const isRed = color === 'red';

  return (
    <Link
      href={href}
      prefetch
      onClick={() => onClick(href)}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'flex h-full min-w-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs',
        isRed ? 'text-cevi-red font-semibold' : 'font-medium text-green-500',
        isActive && !isRed && 'font-bold text-green-900',
        isActive && isRed && 'font-bold',
      )}
    >
      <span
        className={cn(
          'flex h-[30px] w-14 items-center justify-center rounded-full',
          isActive && (isRed ? 'bg-red-100' : 'bg-green-100'),
        )}
      >
        {isCurrentlyLoading ? (
          <Loader2 className="h-[22px] w-[22px] animate-spin" />
        ) : (
          <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
};
