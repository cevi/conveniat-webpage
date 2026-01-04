import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <p
      className={cn(
        'font-body my-2 max-w-2xl text-left text-base font-normal break-words text-gray-500',
        className,
      )}
    >
      {children}
    </p>
  );
};
