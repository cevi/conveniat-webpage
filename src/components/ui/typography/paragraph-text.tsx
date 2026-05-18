import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className, style }) => {
  return (
    <p
      className={cn(
        'font-body my-2 max-w-2xl break-words text-left text-base font-normal text-gray-500',
        className,
      )}
      style={style}
    >
      {children}
    </p>
  );
};
