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
    <div className={cn('border-line overflow-hidden rounded-[14px] border bg-white', className)}>
      {title && (
        <h3
          className={cn(
            'font-heading text-heading px-4 py-3.5 text-base font-bold',
            showBorder && 'border-line border-b',
            headerClassName,
          )}
        >
          {title}
        </h3>
      )}
      <div className={cn(divided && 'divide-line divide-y', contentClassName)}>{children}</div>
    </div>
  );
};
