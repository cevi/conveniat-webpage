import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

interface CardProperties {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  divided?: boolean;
  showBorder?: boolean;
}

export const Card: React.FC<CardProperties> = ({
  children,
  title,
  className,
  contentClassName,
  headerClassName,
  divided = false,
  showBorder = true,
}) => {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white shadow-sm', className)}>
      {title && (
        <h3
          className={cn(
            'px-6 py-4 text-lg font-semibold text-gray-900',
            showBorder && 'border-b border-gray-100',
            headerClassName,
          )}
        >
          {title}
        </h3>
      )}
      <div className={cn(divided && 'divide-y divide-gray-100', contentClassName)}>{children}</div>
    </div>
  );
};
