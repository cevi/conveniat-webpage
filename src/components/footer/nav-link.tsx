import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const NavLink: React.FC<{
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  /** the tab of the page that is shown, announced as the current page */
  isCurrent: boolean;
  color: string | undefined;
  onClick: (href: string) => void;
  isLoading: boolean;
  loadingHref: string | undefined;
  className?: string | undefined;
}> = ({
  href,
  icon: Icon,
  label,
  isActive,
  isCurrent,
  color,
  onClick,
  isLoading,
  loadingHref,
  className,
}) => {
  const isCurrentlyLoading = isLoading && loadingHref === href;

  return (
    <Link
      href={href}
      prefetch
      onClick={() => onClick(href)}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'flex h-full flex-1 flex-col items-center justify-center space-y-1 py-2',
        { 'text-blue-600': isActive },
        className,
      )}
    >
      <div className="relative">
        {isCurrentlyLoading ? (
          <div
            className={cn('h-9 w-12 rounded-xl px-3 py-1.5', {
              'text-conveniat-green bg-green-200': isActive,
              'text-cevi-red': color === 'red',
              'text-cevi-red bg-red-200': isActive && color === 'red',
            })}
          >
            <Loader2
              className={cn('m-auto animate-spin', {
                'text-conveniat-green': true,
                'text-cevi-red': color === 'red',
              })}
            />
          </div>
        ) : (
          <Icon
            className={cn('h-9 w-12 rounded-xl px-3 py-1 text-gray-300', {
              'text-conveniat-green bg-green-200': isActive,
              'text-cevi-red': color === 'red',
              'text-cevi-red bg-red-200': isActive && color === 'red',
            })}
          />
        )}
      </div>
      <span
        className={cn('mt-1 text-xs font-semibold text-gray-400', {
          'text-conveniat-green font-bold': isActive,
          'text-cevi-red': color === 'red',
        })}
      >
        {label}
      </span>
    </Link>
  );
};
